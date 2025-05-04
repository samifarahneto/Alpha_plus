import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isPublicRoute = () => {
    const publicRoutes = ["/", "/login", "/register"];
    return publicRoutes.includes(location.pathname);
  };

  const renderPublicHeader = () => (
    <div className="flex items-center space-x-4">
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
  );

  const renderMasterHeader = () => (
    <div className="flex items-center space-x-4">
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
  );

  const renderClientHeader = () => (
    <div className="flex items-center space-x-4">
      <Link
        to="/client/dashboard"
        className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
          location.pathname === "/client/dashboard"
            ? "text-primary font-bold"
            : ""
        }`}
      >
        Dashboard
      </Link>
      <Link
        to="/client/projects"
        className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
          location.pathname === "/client/projects"
            ? "text-primary font-bold"
            : ""
        }`}
      >
        Projetos
      </Link>
      <Link
        to="/client/profile"
        className={`text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium ${
          location.pathname === "/client/profile"
            ? "text-primary font-bold"
            : ""
        }`}
      >
        Perfil
      </Link>
      <button
        onClick={handleLogout}
        className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium"
      >
        Sair
      </button>
    </div>
  );

  const renderHeaderContent = () => {
    console.log("Usuário atual:", user); // Debug
    console.log("Tipo de usuário:", user?.userType); // Debug
    console.log("Rota atual:", location.pathname); // Debug

    // Se estiver em uma rota pública, mostra o header público
    if (isPublicRoute()) {
      console.log("Mostrando header público - rota pública"); // Debug
      return renderPublicHeader();
    }

    // Se não houver usuário autenticado, mostra o header público
    if (!user) {
      console.log("Mostrando header público - usuário não autenticado"); // Debug
      return renderPublicHeader();
    }

    // Se o usuário estiver autenticado mas não tiver userType, busca no Firestore
    if (!user.userType) {
      console.log(
        "Usuário autenticado mas sem userType, buscando no Firestore..."
      ); // Debug
      // Aqui você precisará implementar a lógica para buscar o userType no Firestore
      return renderPublicHeader();
    }

    const userType = user.userType.toLowerCase();
    console.log("Tipo de usuário (lowercase):", userType); // Debug

    // Renderiza o header apropriado baseado no tipo de usuário
    switch (userType) {
      case "master":
        console.log("Mostrando header do master"); // Debug
        return renderMasterHeader();
      case "b2b":
      case "b2c":
      case "colab":
        console.log("Mostrando header do cliente"); // Debug
        return renderClientHeader();
      default:
        console.log(
          "Mostrando header público - tipo de usuário não reconhecido"
        ); // Debug
        return renderPublicHeader();
    }
  };

  return (
    <nav className="bg-white shadow-md fixed w-full top-0 z-50">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-end h-[70px] px-4 md:px-[100px]">
          {/* Logo à esquerda */}
          <div className="flex items-end">
            <Link to="/">
              <img
                src={logo}
                alt="Logo"
                className="h-[60px] w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-end ml-auto">
            {renderHeaderContent()}
          </div>

          {/* Mobile menu button */}
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

      {/* Mobile Menu */}
      <div
        className={`md:hidden ${
          isMenuOpen ? "block" : "hidden"
        } fixed top-[70px] left-0 right-0 bg-white shadow-md z-50`}
      >
        <div className="flex flex-col space-y-4 p-4">
          {renderHeaderContent()}
        </div>
      </div>
    </nav>
  );
};

export default Header;
