import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebarRef = useRef(null);
  const { user } = useAuth();

  const isPublicRoute = () => {
    const publicRoutes = ["/", "/login", "/register"];
    return publicRoutes.includes(location.pathname);
  };

  const isMasterRoute = () => {
    return location.pathname.startsWith("/company/master");
  };

  const isB2BRoute = () => {
    return (
      location.pathname.startsWith("/company/b2b") ||
      (location.pathname.startsWith("/client") && user?.userType === "b2b")
    );
  };

  const isB2CRoute = () => {
    return (
      location.pathname.startsWith("/company/b2c") ||
      (location.pathname.startsWith("/client") && user?.userType === "b2c")
    );
  };

  const isColabRoute = () => {
    return (
      location.pathname.startsWith("/client") && user?.userType === "colab"
    );
  };

  // Debug logs
  console.log("Current path:", location.pathname);
  console.log("Is B2B route:", isB2BRoute());
  console.log("Is B2C route:", isB2CRoute());
  console.log("Is Master route:", isMasterRoute());
  console.log("Is Public route:", isPublicRoute());
  console.log("Is Colab route:", isColabRoute());

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target) &&
        !event.target.closest('button[aria-label="Abrir menu"]')
      ) {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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

          <div className="hidden md:flex items-end ml-auto space-x-4">
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

          <div className="md:hidden flex items-end">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary focus:outline-none"
            >
              <svg
                className="h-6 w-6"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 24 24"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden ${
          isMenuOpen ? "block" : "hidden"
        } fixed top-[70px] left-0 right-0 bg-white shadow-md z-50`}
      >
        <div className="flex flex-col space-y-4 p-4">
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
              location.pathname === "/register" ? "text-primary font-bold" : ""
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
    </nav>
  );

  const renderMasterHeader = () => (
    <nav className="bg-white shadow-md fixed w-full top-0 z-40">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center h-[70px] px-4">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary focus:outline-none"
          >
            <svg
              className="h-6 w-6"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="flex items-center">
            <img src={logo} alt="Logo" className="h-[60px] w-auto" />
          </div>
          <div className="w-6"></div>{" "}
          {/* Espaçador para manter o logo centralizado */}
        </div>
      </div>
    </nav>
  );

  const renderMasterSidebar = () => (
    <>
      {renderMasterHeader()}
      <div
        ref={sidebarRef}
        className={`fixed left-0 top-[70px] h-[calc(100vh-70px)] w-64 bg-white shadow-md z-30 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 border-b">
            <img src={logo} alt="Logo" className="h-[40px] w-auto" />
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              aria-label="Fechar menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <nav className="flex-1 px-4 py-2">
            <ul className="space-y-1">
              <li>
                <Link
                  to="/company/master/dashboard"
                  className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                    location.pathname === "/company/master/dashboard"
                      ? "text-primary font-medium"
                      : ""
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  to="/company/master/clients"
                  className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                    location.pathname === "/company/master/clients"
                      ? "text-primary font-medium"
                      : ""
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                  Clientes
                </Link>
              </li>
              <li>
                <Link
                  to="/company/master/employees"
                  className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                    location.pathname === "/company/master/employees"
                      ? "text-primary font-medium"
                      : ""
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  Funcionários
                </Link>
              </li>
              <li>
                <Link
                  to="/company/master/projects"
                  className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                    location.pathname === "/company/master/projects"
                      ? "text-primary font-medium"
                      : ""
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Projetos
                </Link>
              </li>
              <li>
                <Link
                  to="/company/master/activity-logs"
                  className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                    location.pathname === "/company/master/activity-logs"
                      ? "text-primary font-medium"
                      : ""
                  }`}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                    />
                  </svg>
                  Log de Atividades
                </Link>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-4 py-2 text-gray-700 hover:text-primary"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );

  const renderB2BOrB2CHeader = () => {
    console.log("Rendering B2B/B2C header");
    return (
      <>
        {renderMasterHeader()}
        <div
          ref={sidebarRef}
          className={`fixed left-0 top-[70px] h-[calc(100vh-70px)] w-64 bg-white shadow-md z-30 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <img src={logo} alt="Logo" className="h-[40px] w-auto" />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Fechar menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-4 py-2">
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/client/dashboard"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/dashboard")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/client/projects/clientaddproject"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/clientaddproject")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Criar Projetos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/client/projects"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/projects")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Projetos
                  </Link>
                </li>
                {!isColabRoute() && (
                  <li>
                    <Link
                      to="/client/add-collaborator"
                      className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                        location.pathname.includes("/add-collaborator")
                          ? "text-primary font-medium"
                          : ""
                      }`}
                    >
                      <svg
                        className="w-5 h-5 mr-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                      Colaboradores
                    </Link>
                  </li>
                )}
                <li>
                  <Link
                    to="/client/profile"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/profile")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Meu Perfil
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2 text-gray-700 hover:text-primary"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  const renderColabHeader = () => {
    console.log("Rendering Colab header");
    return (
      <>
        {renderMasterHeader()}
        <div
          ref={sidebarRef}
          className={`fixed left-0 top-[70px] h-[calc(100vh-70px)] w-64 bg-white shadow-md z-30 transform transition-transform duration-300 ease-in-out ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b">
              <img src={logo} alt="Logo" className="h-[40px] w-auto" />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label="Fechar menu"
              >
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <nav className="flex-1 px-4 py-2">
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/client/dashboard"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/dashboard")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/client/projects/clientaddproject"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/clientaddproject")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                    Criar Projetos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/client/projects"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/projects")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                    Projetos
                  </Link>
                </li>
                <li>
                  <Link
                    to="/client/profile"
                    className={`flex items-center px-4 py-3 text-gray-700 hover:text-primary ${
                      location.pathname.includes("/profile")
                        ? "text-primary font-medium"
                        : ""
                    }`}
                  >
                    <svg
                      className="w-5 h-5 mr-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    Meu Perfil
                  </Link>
                </li>
              </ul>
            </nav>

            <div className="p-4 border-t">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center px-4 py-2 text-gray-700 hover:text-primary"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                Sair
              </button>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Debug log para verificar qual header será renderizado
  console.log("Rendering decision:", {
    isPublic: isPublicRoute(),
    isMaster: isMasterRoute(),
    isB2B: isB2BRoute(),
    isB2C: isB2CRoute(),
    isColab: isColabRoute(),
    userType: user?.userType,
  });

  if (isPublicRoute()) {
    return renderPublicHeader();
  }

  if (isMasterRoute()) {
    return renderMasterSidebar();
  }

  if (isColabRoute()) {
    return renderColabHeader();
  }

  if (isB2BRoute() || isB2CRoute()) {
    return renderB2BOrB2CHeader();
  }

  return null;
};

export default Header;
