import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (authUser) => {
    try {
      const userDoc = await getDoc(doc(db, "users", authUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log("User data loaded:", userData);
        const combinedUser = {
          ...authUser,
          ...userData,
          userType: userData.userType?.toLowerCase() || "b2c",
        };
        console.log("Combined user data:", combinedUser);
        setUser(combinedUser);
      } else {
        console.log("User document not found");
        setUser(authUser);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      setUser(authUser);
    }
    setLoading(false);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", authUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({ ...authUser, ...userData });
          } else {
            console.warn("Documento do usuário não encontrado no Firestore.");
            setUser(authUser);
          }
        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
          setUser(authUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signup = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      await loadUserData(userCredential.user);
      return userCredential;
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Função para verificar se o usuário pode acessar uma rota
  const canAccessRoute = (pathname) => {
    // Rotas públicas sempre permitidas
    const publicRoutes = ["/", "/login", "/register"];
    if (publicRoutes.includes(pathname)) {
      return true;
    }

    // Se não há usuário, só pode acessar rotas públicas
    if (!user) {
      return false;
    }

    const userType = user.userType?.toLowerCase();

    // Rotas do cliente
    if (pathname.startsWith("/client")) {
      return ["b2b", "b2c", "colab"].includes(userType);
    }

    // Rotas do master
    if (pathname.startsWith("/company/master")) {
      return userType === "master";
    }

    // Rota de pagamento
    if (pathname === "/payment") {
      return true; // Qualquer usuário autenticado
    }

    // Por padrão, negar acesso a rotas não reconhecidas
    return false;
  };

  const value = {
    user,
    signup,
    login,
    logout,
    loading,
    canAccessRoute,
  };

  if (loading && !user) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
