import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useMediaQuery } from "react-responsive";
import logo from "../assets/logo.png";
import {
  FaBars,
  FaTimes,
  FaCog,
  FaSignOutAlt,
  FaBox,
  FaChevronDown,
  FaChevronRight,
  FaHome,
  FaUsers,
  FaUserTie,
  FaClipboardList,
  FaUser,
  FaUserPlus,
  FaClock,
  FaCheckCircle,
  FaCheck,
  FaSpinner,
  FaCheckDouble,
  FaMoneyBillWave,
  FaCreditCard,
  FaPlus,
  FaExclamationTriangle,
  FaUndo,
  FaFileAlt,
  FaHourglassHalf,
  FaHandshake,
  FaSearch,
  FaPlay,
  FaTasks,
  FaDollarSign,
  FaReceipt,
  FaChartLine,
} from "react-icons/fa";

const Header = () => {
  const { logout, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isProjectsMenuOpen, setIsProjectsMenuOpen] = useState(true);
  const isMobile = useMediaQuery({ maxWidth: 1023 });

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isPublicRoute = () => {
    if (!user || !user.userType) {
      return true;
    }
    const publicRoutes = ["/", "/login", "/register"];
    return publicRoutes.includes(location.pathname);
  };

  const toggleSidebar = () => {
    setIsSidebarExpanded(!isSidebarExpanded);
  };

  const toggleProjectsMenu = () => {
    setIsProjectsMenuOpen(!isProjectsMenuOpen);
  };

  // Função para mapear ícones baseado na URL específica
  const getIconForPath = (path) => {
    // Mapeamento exato de URLs para ícones específicos
    const iconMap = {
      // Links principais
      "/client/dashboard": <FaHome className="w-5 h-5 text-gray-600" />,
      "/client/profile": <FaUser className="w-5 h-5 text-gray-600" />,
      "/client/add-collaborator": (
        <FaUserPlus className="w-5 h-5 text-gray-600" />
      ),
      "/company/master/dashboard": <FaHome className="w-5 h-5 text-gray-600" />,
      "/company/master/clients": <FaUsers className="w-5 h-5 text-gray-600" />,
      "/company/master/employees": (
        <FaUserTie className="w-5 h-5 text-gray-600" />
      ),
      "/company/master/activity-logs": (
        <FaClipboardList className="w-5 h-5 text-gray-600" />
      ),

      // Links de projetos - Master
      "/company/master/projects": <FaTasks className="w-4 h-4 text-gray-500" />,
      "/company/master/projects-budget": (
        <FaClock className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/projects-approval": (
        <FaHandshake className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/projects-approved": (
        <FaCheck className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/projects-in-analysis": (
        <FaSearch className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/ongoing": <FaPlay className="w-4 h-4 text-gray-500" />,
      "/company/master/projects-done": (
        <FaCheckDouble className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/projects-paid": (
        <FaMoneyBillWave className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/payments": (
        <FaCreditCard className="w-4 h-4 text-gray-500" />
      ),
      "/company/master/add-project": (
        <FaPlus className="w-4 h-4 text-gray-500" />
      ),

      // Links de projetos - Client
      "/client/projects": <FaFileAlt className="w-4 h-4 text-gray-500" />,
      "/client/projects/clientaddproject": (
        <FaPlus className="w-4 h-4 text-gray-500" />
      ),
      "/client/projects-budget": (
        <FaHourglassHalf className="w-4 h-4 text-gray-500" />
      ),
      "/client/projects-budget-received": (
        <FaReceipt className="w-4 h-4 text-gray-500" />
      ),
      "/client/projects-divergence": (
        <FaExclamationTriangle className="w-4 h-4 text-gray-500" />
      ),
      "/client/projects-analysis": (
        <FaSearch className="w-4 h-4 text-gray-500" />
      ),
      "/client/going-on": <FaSpinner className="w-4 h-4 text-gray-500" />,
      "/client/projects-done": (
        <FaCheckCircle className="w-4 h-4 text-gray-500" />
      ),
      "/client/payments": <FaDollarSign className="w-4 h-4 text-gray-500" />,
      "/client/projects-paid": (
        <FaChartLine className="w-4 h-4 text-gray-500" />
      ),
      "/client/projects-refund": <FaUndo className="w-4 h-4 text-gray-500" />,
    };

    // Retorna o ícone específico ou um ícone padrão
    return iconMap[path] || <FaBox className="w-5 h-5 text-gray-600" />;
  };

  // Fechar dropdown e sidebar quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Fechar user menu quando clicar fora
      if (isUserMenuOpen && !event.target.closest(".user-menu-container")) {
        setIsUserMenuOpen(false);
      }

      // Fechar sidebar quando clicar fora (apenas em desktop e quando expandido)
      if (
        !isMobile &&
        isSidebarExpanded &&
        !event.target.closest(".sidebar-container") &&
        !event.target.closest(".sidebar-toggle-btn")
      ) {
        setIsSidebarExpanded(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUserMenuOpen, isSidebarExpanded, isMobile]);

  // Links específicos por tipo de usuário para o menu "Projetos"
  const getProjectLinks = () => {
    const userType = user?.userType;

    if (userType === "master") {
      return [
        { to: "/company/master/projects", label: "Todos Projetos" },
        {
          to: "/company/master/projects-budget",
          label: "Aguardando Orçamento",
        },
        {
          to: "/company/master/projects-approval",
          label: "Aguardando Aprovação",
        },
        { to: "/company/master/projects-approved", label: "Aprovados" },
        { to: "/company/master/projects-in-analysis", label: "Em Análise" },
        { to: "/company/master/ongoing", label: "Em Andamento" },
        { to: "/company/master/projects-done", label: "Projetos Concluídos" },
        { to: "/company/master/projects-paid", label: "Projetos Pagos" },
        { to: "/company/master/payments", label: "Pagamentos Pendentes" },
        { to: "/company/master/add-project", label: "Criar Projeto" },
      ];
    } else {
      // Links para clientes (B2B, B2C, Colab)
      return [
        { to: "/client/projects", label: "Todos Projetos" },
        { to: "/client/projects/clientaddproject", label: "Criar Projetos" },
        { to: "/client/projects-budget", label: "Aguardando Orçamento" },
        { to: "/client/projects-budget-received", label: "Orçamento Recebido" },
        { to: "/client/projects-divergence", label: "Em Divergência" },
        { to: "/client/projects-analysis", label: "Em Análise" },
        { to: "/client/going-on", label: "Em Andamento" },
        { to: "/client/projects-done", label: "Projetos Concluídos" },
        { to: "/client/payments", label: "Pagamentos Pendentes" },
        { to: "/client/projects-paid", label: "Projetos Pagos" },
        { to: "/client/projects-refund", label: "Em Reembolso" },
      ];
    }
  };

  // Links principais de navegação (não são projetos)
  const getMainLinks = () => {
    const userType = user?.userType;

    if (userType === "master") {
      return [
        { to: "/company/master/dashboard", label: "Dashboard" },
        { to: "/company/master/clients", label: "Clientes" },
        { to: "/company/master/employees", label: "Funcionários" },
        { to: "/company/master/activity-logs", label: "Log de Atividades" },
      ];
    } else {
      const links = [
        { to: "/client/dashboard", label: "Dashboard" },
        { to: "/client/profile", label: "Meu Perfil" },
      ];

      // Adicionar colaboradores se for b2b ou b2c
      if (userType === "b2b" || userType === "b2c") {
        links.splice(1, 0, {
          to: "/client/add-collaborator",
          label: "Colaboradores",
        });
      }

      return links;
    }
  };

  const isActive = (path) => {
    return (
      location.pathname === path ||
      location.pathname.includes(path.split("/").pop() || "")
    );
  };

  if (loading) {
    return (
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <nav className="w-full px-4 lg:px-[100px]">
          <div className="flex justify-between items-center h-[70px]">
            <div className="flex items-center">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </div>
            <div className="hidden lg:flex items-center space-x-4">
              <span className="text-gray-500">Carregando...</span>
            </div>
          </div>
        </nav>
      </header>
    );
  }

  // Header para rotas públicas
  if (isPublicRoute()) {
    const publicLinks = [
      { to: "/", label: "Início" },
      { to: "/register", label: "Registrar-se" },
      { to: "/login", label: "Login" },
    ];

    return (
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <nav className="w-full px-4 lg:px-[100px]">
          <div className="flex justify-between items-center h-[70px]">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>

            {/* Navigation Links - Desktop */}
            <div className="hidden lg:flex items-center space-x-6">
              {publicLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(link.to) ? "text-primary font-bold" : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Menu Mobile */}
            <div className="lg:hidden">
              <button
                onClick={toggleSidebar}
                className="text-gray-700 hover:text-primary p-2 sidebar-toggle-btn"
              >
                <FaBars className="w-6 h-6" />
              </button>
            </div>
          </div>
        </nav>

        {/* Sidebar Mobile para páginas públicas */}
        {isSidebarExpanded && (
          <>
            <div
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={toggleSidebar}
            />
            <div className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 lg:hidden">
              <div className="flex justify-between items-center p-4 border-b">
                <img src={logo} alt="Logo" className="h-8 w-auto" />
                <button
                  onClick={toggleSidebar}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <FaTimes className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <nav className="flex flex-col space-y-2">
                  {publicLinks.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={toggleSidebar}
                      className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                        isActive(link.to)
                          ? "text-primary font-bold bg-blue-50"
                          : ""
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
          </>
        )}
      </header>
    );
  }

  // Header para usuários autenticados
  const userType = user?.userType;
  const projectLinks = getProjectLinks();
  const mainLinks = getMainLinks();

  return (
    <>
      {/* Header Fixo */}
      <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
        <nav className="w-full px-4 lg:px-[100px]">
          <div className="flex justify-between items-center h-[70px]">
            {/* Menu + Logo */}
            <div className="flex items-center">
              <button
                onClick={toggleSidebar}
                className="text-gray-700 hover:text-primary p-2 mr-2 sidebar-toggle-btn"
              >
                <FaBars className="w-6 h-6" />
              </button>
              <Link
                to={
                  userType === "master"
                    ? "/company/master/dashboard"
                    : "/client/dashboard"
                }
                className="flex items-center"
              >
                <img
                  src={logo}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                />
              </Link>
            </div>

            {/* User Info - Centro */}
            <div className="hidden lg:block">
              <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
            </div>

            {/* Menu de Configuração */}
            <div className="relative user-menu-container">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center justify-center w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors duration-200"
              >
                <FaCog className="w-5 h-5 text-gray-600" />
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border">
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FaSignOutAlt className="w-4 h-4 mr-2" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </nav>
      </header>

      {/* Sidebar */}
      {(!isMobile || isSidebarExpanded) && (
        <aside
          className={`sidebar-container fixed top-[70px] left-0 bottom-0 bg-white shadow-lg z-40 transition-all duration-300 ${
            isSidebarExpanded ? "w-64" : isMobile ? "w-64" : "w-[70px]"
          }`}
        >
          <div className="flex flex-col h-full">
            <nav className="flex-1 py-4">
              <div className="px-2 space-y-2">
                {/* Links Principais */}
                {mainLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center ${
                      isSidebarExpanded || isMobile ? "px-3" : "justify-center"
                    } py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 ${
                      isActive(link.to)
                        ? "text-primary bg-blue-50 font-medium"
                        : ""
                    }`}
                    title={!isSidebarExpanded && !isMobile ? link.label : ""}
                  >
                    {getIconForPath(link.to)}
                    {(isSidebarExpanded || isMobile) && (
                      <span className="ml-3 text-sm font-medium">
                        {link.label}
                      </span>
                    )}
                  </Link>
                ))}

                {/* Menu Projetos */}
                <button
                  onClick={toggleProjectsMenu}
                  className={`w-full flex items-center ${
                    isSidebarExpanded || isMobile
                      ? "justify-between px-3"
                      : "justify-center"
                  } py-3 text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200`}
                  title={!isSidebarExpanded && !isMobile ? "Projetos" : ""}
                >
                  <div className="flex items-center">
                    <FaBox className="w-5 h-5 text-gray-600" />
                    {(isSidebarExpanded || isMobile) && (
                      <span className="ml-3 text-sm font-medium">Projetos</span>
                    )}
                  </div>
                  {(isSidebarExpanded || isMobile) && (
                    <div className="transform transition-transform duration-200">
                      {isProjectsMenuOpen ? (
                        <FaChevronDown className="w-4 h-4 text-gray-400" />
                      ) : (
                        <FaChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  )}
                </button>

                {/* Sublinks dos Projetos */}
                {isProjectsMenuOpen && (isSidebarExpanded || isMobile) && (
                  <div className="ml-4 mt-2 space-y-1 border-l border-gray-200 pl-4">
                    {projectLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className={`flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors duration-200 ${
                          isActive(link.to)
                            ? "text-primary bg-blue-50 font-medium"
                            : ""
                        }`}
                      >
                        {getIconForPath(link.to)}
                        <span className="ml-2">{link.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </aside>
      )}

      {/* Overlay para mobile */}
      {isSidebarExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Ajuste do conteúdo principal */}
      <div
        className={`transition-all duration-300 ${
          !isMobile && isSidebarExpanded
            ? "lg:ml-64"
            : !isMobile
            ? "lg:ml-[70px]"
            : ""
        }`}
      >
        {/* Conteúdo será renderizado aqui */}
      </div>
    </>
  );
};

export default Header;
