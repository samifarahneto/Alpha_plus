import React from "react";

const PageLayout = ({ children }) => {
  return <div className="w-full min-h-[calc(100vh-80px)]">{children}</div>;
};

export default PageLayout;
