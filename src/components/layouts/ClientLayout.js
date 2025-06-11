import React from "react";

const ClientLayout = ({ children }) => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mt-5 pt-0 pl-4 pr-4 md:pl-20 md:pr-5">
        {children}
      </div>
    </div>
  );
};

export default ClientLayout;
