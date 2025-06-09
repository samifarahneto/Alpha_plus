import React from "react";

const ClientLayout = ({ children }) => {
  return (
    <div className="w-full">
      <div className="w-full">
        {/* Conteúdo da página */}
        <div className="content-container">{children}</div>
      </div>
    </div>
  );
};

export default ClientLayout;
