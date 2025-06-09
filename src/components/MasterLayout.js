import React from "react";
import { Outlet } from "react-router-dom";

const MasterLayout = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1 mt-0 pt-0 pl-4 pr-4 md:pl-20 md:pr-5">
        <Outlet />
      </div>
    </div>
  );
};

export default MasterLayout;
