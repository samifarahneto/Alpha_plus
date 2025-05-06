import React from "react";
import { useLocation } from "react-router-dom";
import ClientNavigation from "../../pages/client/ClientNavigation";

const ClientLayout = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop();

  return (
    <div className="w-full">
      <div className="w-full">
        <ClientNavigation
          activeLink={currentPath}
          setActiveLink={() => {}}
          unreadCount={0}
          unreadBudgetCount={0}
          unreadApprovalCount={0}
        />

        {/* Conteúdo da página */}
        <div className="content-container px-4 md:px-10">{children}</div>
      </div>
    </div>
  );
};

export default ClientLayout;
