import React from "react";
import { useMediaQuery } from "react-responsive";

const ClientLayout = ({ children }) => {
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });

  // Verificar se o sidebar está expandido (lógica similar ao Header.js)
  const [isSidebarExpanded, setIsSidebarExpanded] = React.useState(false);

  // Escutar mudanças no localStorage ou state global do sidebar
  React.useEffect(() => {
    const handleSidebarChange = () => {
      // Verificar se existe algum indicador do estado do sidebar
      const sidebarState = localStorage.getItem("sidebarExpanded");
      if (sidebarState !== null) {
        setIsSidebarExpanded(JSON.parse(sidebarState));
      }
    };

    // Verificar estado inicial
    handleSidebarChange();

    // Escutar mudanças
    window.addEventListener("storage", handleSidebarChange);
    window.addEventListener("sidebarToggle", handleSidebarChange);

    return () => {
      window.removeEventListener("storage", handleSidebarChange);
      window.removeEventListener("sidebarToggle", handleSidebarChange);
    };
  }, []);

  return (
    <div
      className={`flex flex-col min-h-screen transition-all duration-300 ${
        isMobile ? "" : isTablet || isSidebarExpanded ? "ml-72" : "ml-16"
      }`}
    >
      <div className="flex-1 mt-5 pt-0 w-[95%] mx-auto">{children}</div>
    </div>
  );
};

export default ClientLayout;
