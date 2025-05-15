import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Verifique se o caminho está correto
import logo from "../assets/logo.png"; // Verifique se o caminho está correto
import { FaBars, FaTimes } from "react-icons/fa";

const Header = () => {
  const { user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  // As funções isMasterRoute, isB2BRoute, etc., agora só precisam checar o user.userType,
  // pois a lógica de rota pública e loading já foi tratada.
  const isMasterUser = () => user?.userType === "master";
  const isB2BUser = () => user?.userType === "b2b";
  const isB2CUser = () => user?.userType === "b2c";
  const isColabUser = () => user?.userType === "colab";

  const canAccessCollaborators = () => {
    return user?.userType === "b2b" || user?.userType === "b2c";
  };

  const handleLogout = async () => {
    try {
      closeSidebar(); // Fechar sidebar primeiro
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

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
        {user && (
          <p className="text-gray-700 text-sm mb-4">Olá, {user.email}</p>
        )}
        <nav className="flex flex-col space-y-2">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={closeSidebar}
              className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname.startsWith(link.to) // Usar startsWith para melhor correspondência de activePath
                  ? "text-primary font-bold bg-blue-50"
                  : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
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
      { to: "/company/master/dashboard", label: "Dashboard" },
      { to: "/company/master/clients", label: "Clientes" },
      { to: "/company/master/employees", label: "Funcionários" },
      { to: "/company/master/projects", label: "Projetos" },
      { to: "/company/master/activity-logs", label: "Log de Atividades" },
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
              {user && (
                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-gray-700 text-sm">Olá, {user.email}</p>
                </div>
              )}
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
                        location.pathname.startsWith(link.to)
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
    const clientLinksBase = [
      { to: "/client/dashboard", label: "Dashboard" },
      { to: "/client/projects/clientaddproject", label: "Criar Projetos" },
      { to: "/client/projects", label: "Projetos" },
      { to: "/client/profile", label: "Meu Perfil" },
    ];
    let clientLinks = [...clientLinksBase];
    if (canAccessCollaborators()) {
      clientLinks.splice(3, 0, {
        to: "/client/add-collaborator",
        label: "Colaboradores",
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
              {user && (
                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-gray-700 text-sm">Olá, {user.email}</p>
                </div>
              )}
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
                        location.pathname.startsWith(link.to)
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
      { to: "/client/dashboard", label: "Dashboard" },
      { to: "/client/projects/clientaddproject", label: "Criar Projetos" },
      { to: "/client/projects", label: "Projetos" },
      { to: "/client/profile", label: "Meu Perfil" },
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
              {user && (
                <div className="hidden md:block absolute left-1/2 transform -translate-x-1/2 text-center">
                  <p className="text-gray-700 text-sm">Olá, {user.email}</p>
                </div>
              )}
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
                        location.pathname.startsWith(link.to)
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

  if (isLoading) {
    return null; // Ou um componente de carregamento, se preferir
  }

  // Prioridade: Se estiver nas páginas de login ou registro, sempre mostrar o header público.
  if (location.pathname === "/login" || location.pathname === "/register") {
    return renderPublicHeader();
  }

  // Lógica de decisão principal para qual header renderizar:
  // Se não houver usuário (e não estivermos em /login ou /register, já tratados),
  // ou se a rota for a raiz "/", renderiza o header público.
  if (!user || location.pathname === "/") {
    return renderPublicHeader();
  }

  // A partir daqui, o usuário está logado e não estamos em /login, /register ou /.
  if (isMasterUser()) {
    return renderMasterHeader();
  }
  if (isB2BUser() || isB2CUser()) {
    return renderB2BOrB2CHeader();
  }
  if (isColabUser()) {
    return renderColabHeader();
  }

  // Fallback: Usuário logado, mas tipo não reconhecido ou estado inesperado.
  console.warn(
    "Header: Tipo de usuário não reconhecido ou estado inesperado, renderizando header público como fallback.",
    user
  );
  return renderPublicHeader();
};

export default Header;
