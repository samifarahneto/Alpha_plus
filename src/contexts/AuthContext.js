import React, { createContext, useContext, useState, useEffect } from "react";
import { auth, db } from "../firebaseConfig"; // Garanta que o caminho para firebaseConfig está correto
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, onSnapshot } from "firebase/firestore"; // Import onSnapshot

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true); // Loading for Firebase Auth state
  const [profileLoading, setProfileLoading] = useState(true); // Loading for Firestore user profile

  useEffect(() => {
    // Listener for Firebase Auth state changes
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        // User is signed in, now listen for Firestore profile data
        setProfileLoading(true); // Start loading profile
        const userDocRef = doc(db, "users", firebaseUser.uid);

        // Setup onSnapshot listener for the user's document
        const unsubscribeSnapshot = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const userData = docSnap.data();
              console.log(
                "AuthContext (onSnapshot): User data updated:",
                userData
              );
              setUser({
                ...firebaseUser, // Firebase auth data (uid, email, emailVerified, etc.)
                ...userData, // Firestore data (userType, nomeCompleto, etc.)
                userType: userData.userType?.toLowerCase() || "b2c", // Ensure userType and default
              });
            } else {
              // Document doesn't exist, might be a new registration before doc creation
              // or an error. For a new registration, the signup function should create this.
              console.warn(
                "AuthContext (onSnapshot): User document not found for UID:",
                firebaseUser.uid
              );
              // Set user with Firebase data only, userType will be undefined or default in setUser above
              // Or, handle this as an error state if a document is always expected after login.
              setUser({ ...firebaseUser, userType: undefined });
            }
            setProfileLoading(false); // Profile loading finished (either found or not)
          },
          (error) => {
            console.error(
              "AuthContext (onSnapshot): Error listening to user document:",
              error
            );
            setUser({ ...firebaseUser, userType: undefined }); // Set user with Firebase data, mark profile as loaded with error
            setProfileLoading(false);
          }
        );
        setAuthLoading(false); // Auth part is done, profile is now loading via snapshot

        // Return a cleanup function for the onSnapshot listener
        return () => {
          console.log(
            "AuthContext: Cleaning up onSnapshot listener for user:",
            firebaseUser.uid
          );
          unsubscribeSnapshot();
          setProfileLoading(true); // Reset profile loading when user logs out or changes
        };
      } else {
        // User is signed out
        console.log("AuthContext: User is signed out.");
        setUser(null);
        setAuthLoading(false);
        setProfileLoading(false); // No profile to load if no user
      }
    });

    // Return a cleanup function for the onAuthStateChanged listener
    return () => {
      console.log("AuthContext: Cleaning up onAuthStateChanged listener.");
      unsubscribeAuth();
    };
  }, []);

  const signup = async (
    email,
    password,
    userType = "b2c",
    additionalData = {}
  ) => {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );
    const firebaseUser = userCredential.user;

    const userDocRef = doc(db, "users", firebaseUser.uid);
    // This will trigger the onSnapshot listener in useEffect if it's already set up,
    // or be ready for when onAuthStateChanged picks up the new user.
    await setDoc(userDocRef, {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      userType: userType.toLowerCase(),
      createdAt: new Date(),
      ...additionalData,
    });
    // onAuthStateChanged and subsequently onSnapshot will handle setting the user state.
    return userCredential;
  };

  const login = async (email, password) => {
    // signInWithEmailAndPassword will trigger onAuthStateChanged, which then sets up onSnapshot.
    return signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    // signOut will trigger onAuthStateChanged, which will set user to null.
    return signOut(auth);
  };

  // isLoading is true if either Firebase auth state is loading,
  // or if a user is present but their Firestore profile is still loading.
  const isLoadingGlobal = authLoading || (user != null && profileLoading);

  const value = {
    user,
    signup,
    login,
    logout,
    isLoading: isLoadingGlobal,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* Render children only when not loading. Or show a global spinner. */}
      {!isLoadingGlobal ? children : null}
    </AuthContext.Provider>
  );
}
