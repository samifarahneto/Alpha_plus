import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";
import { FaBars, FaTimes } from "react-icons/fa";

const Header = () => {
  const { logout, user, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && user?.userType) {
      console.log("Usuário carregado:", user);
    }
  }, [loading, user]);

  if (loading) {
    return (
      <nav className="bg-white shadow-md fixed w-full top-0 z-40">
        <div className="w-full mx-auto">
          <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
            <div className="flex items-end">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </div>
            <div className="hidden md:flex items-end space-x-4">
              <span className="text-gray-500">Carregando...</span>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

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

  const isMasterRoute = () => {
    const isMaster = user?.userType === "master";
    const isMasterPath = location.pathname.startsWith("/company/master");
    return isMaster && isMasterPath;
  };

  const isB2BRoute = () => {
    const isB2B = user?.userType === "b2b";
    const isClientRoute = location.pathname.startsWith("/client");
    return isB2B && isClientRoute;
  };

  const isB2CRoute = () => {
    const isB2C = user?.userType === "b2c";
    const isClientRoute = location.pathname.startsWith("/client");
    return isB2C && isClientRoute;
  };

  const isColabRoute = () => {
    const isColab = user?.userType === "colab";
    const isClientRoute = location.pathname.startsWith("/client");
    return isColab && isClientRoute;
  };

  const canAccessCollaborators = () => {
    return user?.userType === "b2b" || user?.userType === "b2c";
  };

  const renderPublicHeader = () => {
    const publicLinks = [
      { to: "/", label: "Início", activePath: "/" },
      { to: "/register", label: "Registrar-se", activePath: "/register" },
      { to: "/login", label: "Login", activePath: "/login" },
    ];

    return (
      <>
        <nav className="bg-white shadow-md fixed w-full top-0 z-40">
          <div className="w-full mx-auto">
            <div className="flex items-end h-[70px] px-4 md:px-[100px]">
              {/* Menu Button - Mobile */}
              <button
                onClick={toggleSidebar}
                className="md:hidden text-gray-700 hover:text-primary p-2 self-end"
              >
                <FaBars className="w-6 h-6" />
              </button>

              {/* Logo - Mobile & Desktop */}
              <Link
                to={user ? "/client/dashboard" : "/"}
                className="flex-1 md:flex-none flex justify-center md:justify-start"
              >
                <img
                  src={logo}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                />
              </Link>

              {/* User Info - Desktop */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center self-end">
                <p className="text-gray-700 text-sm px-3 py-2">
                  Olá, {user?.email}
                </p>
              </div>

              {/* Navigation Links - Desktop */}
              <div className="hidden md:flex items-end space-x-4 ml-auto self-end">
                {publicLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname === link.activePath
                        ? "text-primary font-bold"
                        : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Mobile */}
        <div
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50`}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
            <button
              onClick={closeSidebar}
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
                  onClick={closeSidebar}
                  className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === link.activePath
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

        {/* Overlay para fechar o menu ao clicar fora */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
        )}
      </>
    );
  };

  const renderMasterHeader = () => {
    const masterLinks = [
      {
        to: "/company/master/dashboard",
        label: "Dashboard",
        activePath: "/dashboard",
      },
      {
        to: "/company/master/clients",
        label: "Clientes",
        activePath: "/clients",
      },
      {
        to: "/company/master/employees",
        label: "Funcionários",
        activePath: "/employees",
      },
      {
        to: "/company/master/projects",
        label: "Projetos",
        activePath: "/projects",
      },
      {
        to: "/company/master/activity-logs",
        label: "Log de Atividades",
        activePath: "/activity-logs",
      },
    ];

    return (
      <>
        <nav className="bg-white shadow-md fixed w-full top-0 z-40">
          <div className="w-full mx-auto">
            <div className="flex items-end h-[70px] px-4 md:px-[100px]">
              {/* Menu Button - Mobile */}
              <button
                onClick={toggleSidebar}
                className="md:hidden text-gray-700 hover:text-primary p-2 self-end"
              >
                <FaBars className="w-6 h-6" />
              </button>

              {/* Logo - Mobile & Desktop */}
              <Link
                to="/company/master/dashboard"
                className="flex-1 md:flex-none flex justify-center md:justify-start"
              >
                <img
                  src={logo}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                />
              </Link>

              {/* User Info - Desktop */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center self-end">
                <p className="text-gray-700 text-sm px-3 py-2">
                  Olá, {user?.email}
                </p>
              </div>

              {/* Navigation Links - Desktop */}
              <div className="hidden md:flex items-end space-x-4 ml-auto self-end">
                {masterLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes(link.activePath)
                        ? "text-primary font-bold"
                        : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Mobile */}
        <div
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50`}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
            <button
              onClick={closeSidebar}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-gray-700 text-sm mb-4">Olá, {user?.email}</p>
            <nav className="flex flex-col space-y-2">
              {masterLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeSidebar}
                  className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.includes(link.activePath)
                      ? "text-primary font-bold bg-blue-50"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  closeSidebar();
                  handleLogout();
                }}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium text-left"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>

        {/* Overlay para fechar o menu ao clicar fora */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
        )}
      </>
    );
  };

  const renderB2BOrB2CHeader = () => {
    const clientLinks = [
      { to: "/client/dashboard", label: "Dashboard", activePath: "/dashboard" },
      {
        to: "/client/projects/clientaddproject",
        label: "Criar Projetos",
        activePath: "/clientaddproject",
      },
      { to: "/client/projects", label: "Projetos", activePath: "/projects" },
      { to: "/client/profile", label: "Meu Perfil", activePath: "/profile" },
    ];

    if (canAccessCollaborators()) {
      clientLinks.splice(3, 0, {
        to: "/client/add-collaborator",
        label: "Colaboradores",
        activePath: "/add-collaborator",
      });
    }

    return (
      <>
        <nav className="bg-white shadow-md fixed w-full top-0 z-40">
          <div className="w-full mx-auto">
            <div className="flex items-end h-[70px] px-4 md:px-[100px]">
              {/* Menu Button - Mobile */}
              <button
                onClick={toggleSidebar}
                className="md:hidden text-gray-700 hover:text-primary p-2 self-end"
              >
                <FaBars className="w-6 h-6" />
              </button>

              {/* Logo - Mobile & Desktop */}
              <Link
                to="/client/dashboard"
                className="flex-1 md:flex-none flex justify-center md:justify-start"
              >
                <img
                  src={logo}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                />
              </Link>

              {/* User Info - Desktop */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center self-end">
                <p className="text-gray-700 text-sm px-3 py-2">
                  Olá, {user?.email}
                </p>
              </div>

              {/* Navigation Links - Desktop */}
              <div className="hidden md:flex items-end space-x-4 ml-auto self-end">
                {clientLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes(link.activePath)
                        ? "text-primary font-bold"
                        : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Mobile */}
        <div
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50`}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
            <button
              onClick={closeSidebar}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-gray-700 text-sm mb-4">Olá, {user?.email}</p>
            <nav className="flex flex-col space-y-2">
              {clientLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeSidebar}
                  className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.includes(link.activePath)
                      ? "text-primary font-bold bg-blue-50"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  closeSidebar();
                  handleLogout();
                }}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium text-left"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>

        {/* Overlay para fechar o menu ao clicar fora */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
        )}
      </>
    );
  };

  const renderColabHeader = () => {
    const colabLinks = [
      { to: "/client/dashboard", label: "Dashboard", activePath: "/dashboard" },
      {
        to: "/client/projects/clientaddproject",
        label: "Criar Projetos",
        activePath: "/clientaddproject",
      },
      { to: "/client/projects", label: "Projetos", activePath: "/projects" },
      { to: "/client/profile", label: "Meu Perfil", activePath: "/profile" },
    ];

    return (
      <>
        <nav className="bg-white shadow-md fixed w-full top-0 z-40">
          <div className="w-full mx-auto">
            <div className="flex items-end h-[70px] px-4 md:px-[100px]">
              {/* Menu Button - Mobile */}
              <button
                onClick={toggleSidebar}
                className="md:hidden text-gray-700 hover:text-primary p-2 self-end"
              >
                <FaBars className="w-6 h-6" />
              </button>

              {/* Logo - Mobile & Desktop */}
              <Link
                to="/client/dashboard"
                className="flex-1 md:flex-none flex justify-center md:justify-start"
              >
                <img
                  src={logo}
                  alt="Logo"
                  className="h-[60px] w-auto object-contain"
                />
              </Link>

              {/* User Info - Desktop */}
              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center self-end">
                <p className="text-gray-700 text-sm px-3 py-2">
                  Olá, {user?.email}
                </p>
              </div>

              {/* Navigation Links - Desktop */}
              <div className="hidden md:flex items-end space-x-4 ml-auto self-end">
                {colabLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                      location.pathname.includes(link.activePath)
                        ? "text-primary font-bold"
                        : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sair
                </button>
              </div>
            </div>
          </div>
        </nav>

        {/* Sidebar Mobile */}
        <div
          className={`fixed inset-y-0 left-0 transform ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          } w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out z-50`}
        >
          <div className="flex justify-between items-center p-4 border-b">
            <img src={logo} alt="Logo" className="h-8 w-auto" />
            <button
              onClick={closeSidebar}
              className="text-gray-500 hover:text-gray-700"
            >
              <FaTimes className="w-5 h-5" />
            </button>
          </div>
          <div className="p-4">
            <p className="text-gray-700 text-sm mb-4">Olá, {user?.email}</p>
            <nav className="flex flex-col space-y-2">
              {colabLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={closeSidebar}
                  className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname.includes(link.activePath)
                      ? "text-primary font-bold bg-blue-50"
                      : ""
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <button
                onClick={() => {
                  closeSidebar();
                  handleLogout();
                }}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium text-left"
              >
                Sair
              </button>
            </nav>
          </div>
        </div>

        {/* Overlay para fechar o menu ao clicar fora */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={closeSidebar}
          />
        )}
      </>
    );
  };

  if (isPublicRoute()) {
    return renderPublicHeader();
  }

  if (isMasterRoute()) {
    return renderMasterHeader();
  }

  if (isB2BRoute() || isB2CRoute()) {
    return renderB2BOrB2CHeader();
  }

  if (isColabRoute()) {
    return renderColabHeader();
  }

  return renderPublicHeader();
};

export default Header;
