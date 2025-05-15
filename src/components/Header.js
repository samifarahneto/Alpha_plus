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
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!loading && user?.userType) {
      console.log("Usuário carregado:", user);
      setIsInitialLoad(false);
    }
  }, [loading, user]);

  if (loading || isInitialLoad) {
    console.log("Carregando estado do usuário...");
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

  const isPublicRoute = () => {
    console.log("isPublicRoute chamado. Usuário:", user, "Caminho:", location.pathname);
    if (!user || !user.userType) {
      console.log("Retornando true porque o usuário não está autenticado ou o tipo de usuário não está definido.");
      return true;
    }
    const publicRoutes = ["/", "/login", "/register"];
    const isPublic = publicRoutes.includes(location.pathname);
    console.log("Retornando", isPublic, "para o caminho público.");
    return isPublic;
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  if (!isPublicRoute() && !user?.userType) {
    return null;
  }

  const renderMobileMenu = (links) => (
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
          {links.map((link) => (
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
  );

  const renderPublicHeader = () => (
    <nav className="bg-white shadow-md fixed w-full top-0 z-40">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
          <div className="flex items-end">
            <Link to="/">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>

          <div className="hidden md:flex items-end space-x-4">
            <Link
              to="/"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/" ? "text-primary font-bold" : ""
              }`}
            >
              Início
            </Link>
            <Link
              to="/register"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/register"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Registrar-se
            </Link>
            <Link
              to="/login"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/login" ? "text-primary font-bold" : ""
              }`}
            >
              Login
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );

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
            <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
              <div className="flex items-end md:flex-none">
                <button
                  onClick={toggleSidebar}
                  className="md:hidden text-gray-700 hover:text-primary p-2"
                >
                  <FaBars className="w-6 h-6" />
                </button>
                <Link
                  to="/company/master/dashboard"
                  className="hidden md:block"
                >
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-[60px] w-auto object-contain"
                  />
                </Link>
              </div>

              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
              </div>

              <div className="flex items-end">
                <Link
                  to="/company/master/dashboard"
                  className="md:hidden flex-1 flex justify-center"
                >
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-[50px] w-auto object-contain"
                  />
                </Link>
                <div className="hidden md:flex items-end space-x-4">
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
          </div>
        </nav>
        {renderMobileMenu(masterLinks)}
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
            <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
              <div className="flex items-end md:flex-none">
                <button
                  onClick={toggleSidebar}
                  className="md:hidden text-gray-700 hover:text-primary p-2"
                >
                  <FaBars className="w-6 h-6" />
                </button>
                <Link to="/client/dashboard" className="hidden md:block">
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-[60px] w-auto object-contain"
                  />
                </Link>
              </div>

              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
              </div>

              <div className="flex items-end">
                <Link
                  to="/client/dashboard"
                  className="md:hidden flex-1 flex justify-center"
                >
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-[50px] w-auto object-contain"
                  />
                </Link>
                <div className="hidden md:flex items-end space-x-4">
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
          </div>
        </nav>
        {renderMobileMenu(clientLinks)}
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
            <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
              <div className="flex items-end md:flex-none">
                <button
                  onClick={toggleSidebar}
                  className="md:hidden text-gray-700 hover:text-primary p-2"
                >
                  <FaBars className="w-6 h-6" />
                </button>
                <Link to="/client/dashboard" className="hidden md:block">
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-[60px] w-auto object-contain"
                  />
                </Link>
              </div>

              <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center">
                <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
              </div>

              <div className="flex items-end">
                <Link
                  to="/client/dashboard"
                  className="md:hidden flex-1 flex justify-center"
                >
                  <img
                    src={logo}
                    alt="Logo"
                    className="h-[50px] w-auto object-contain"
                  />
                </Link>
                <div className="hidden md:flex items-end space-x-4">
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
          </div>
        </nav>
        {renderMobileMenu(colabLinks)}
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
