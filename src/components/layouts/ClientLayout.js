import React from "react";
import { useLocation } from "react-router-dom";
import ClientNavigation from "../../pages/client/ClientNavigation";

const ClientLayout = ({ children }) => {
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop();

  return (
    <div className="w-full px-10 md:px-10">
      <div className="w-full">
        <ClientNavigation
          activeLink={currentPath}
          setActiveLink={() => {}}
          unreadCount={0}
          unreadBudgetCount={0}
          unreadApprovalCount={0}
        />

        {/* Conteúdo da página */}
        <div className="content-container">{children}</div>
      </div>
    </div>
  );
};

export default ClientLayout;
