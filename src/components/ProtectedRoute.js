import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({
  children,
  allowedUserTypes = null,
  requireAuth = true,
}) => {
  const { user, loading } = useAuth();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Se require autenticação e não há usuário, redireciona para login
  if (requireAuth && !user) {
    return <Navigate to="/login" replace />;
  }

  // Se há tipos de usuário específicos permitidos
  if (allowedUserTypes && user) {
    const userType = user.userType?.toLowerCase();
    const allowedTypes = allowedUserTypes.map((type) => type.toLowerCase());

    if (!allowedTypes.includes(userType)) {
      // Redireciona baseado no tipo de usuário
      if (userType === "master") {
        return <Navigate to="/company/master/dashboard" replace />;
      } else {
        return <Navigate to="/client/dashboard" replace />;
      }
    }
  }

  return children;
};

export default ProtectedRoute;
