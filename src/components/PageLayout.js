import React from "react";
import Header from "./Header";

const PageLayout = ({ children, hideHeader = false }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      {!hideHeader && <Header />}
      <main className="pt-20">{children}</main>
    </div>
  );
};

export default PageLayout;
