import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const Header = () => {
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const isPublicRoute = () => {
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

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const renderPublicHeader = () => (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50">
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

          <div className="flex items-end space-x-4">
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

  const renderMasterHeader = () => (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
          <div className="flex items-end">
            <Link to="/company/master/dashboard">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
          </div>

          <div className="flex items-end space-x-4">
            <Link
              to="/company/master/dashboard"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/company/master/dashboard"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/company/master/clients"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/company/master/clients"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Clientes
            </Link>
            <Link
              to="/company/master/employees"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/company/master/employees"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Funcionários
            </Link>
            <Link
              to="/company/master/projects"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/company/master/projects"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Projetos
            </Link>
            <Link
              to="/company/master/activity-logs"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === "/company/master/activity-logs"
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Log de Atividades
            </Link>
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
  );

  const renderB2BOrB2CHeader = () => (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
          <div className="flex items-end">
            <Link to="/client/dashboard">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
          </div>

          <div className="flex items-end space-x-4">
            <Link
              to="/client/dashboard"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/dashboard")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/client/projects/clientaddproject"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/clientaddproject")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Criar Projetos
            </Link>
            <Link
              to="/client/projects"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/projects")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Projetos
            </Link>
            {canAccessCollaborators() && (
              <Link
                to="/client/add-collaborator"
                className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                  location.pathname.includes("/add-collaborator")
                    ? "text-primary font-bold"
                    : ""
                }`}
              >
                Colaboradores
              </Link>
            )}
            <Link
              to="/client/profile"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/profile")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Meu Perfil
            </Link>
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
  );

  const renderColabHeader = () => (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
          <div className="flex items-end">
            <Link to="/client/dashboard">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>

          <div className="absolute left-1/2 transform -translate-x-1/2 text-center">
            <p className="text-gray-700 text-sm">Olá, {user?.email}</p>
          </div>

          <div className="flex items-end space-x-4">
            <Link
              to="/client/dashboard"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/dashboard")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Dashboard
            </Link>
            <Link
              to="/client/projects/clientaddproject"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/clientaddproject")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Criar Projetos
            </Link>
            <Link
              to="/client/projects"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/projects")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Projetos
            </Link>
            <Link
              to="/client/profile"
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.includes("/profile")
                  ? "text-primary font-bold"
                  : ""
              }`}
            >
              Meu Perfil
            </Link>
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
  );

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
