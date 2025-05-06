import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ProtectedRoute = ({ children, allowedUserTypes }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!allowedUserTypes.includes(user.userType)) {
    return <Navigate to="/client/dashboard" />;
  }

  return children;
};

export default ProtectedRoute;
