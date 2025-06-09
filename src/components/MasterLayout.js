import React from "react";
import { Outlet } from "react-router-dom";

const MasterLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mt-0 px-20">
        <Outlet />
      </div>
    </div>
  );
};

export default MasterLayout;
