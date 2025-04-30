// src/pages/company/master/MasterLayout.js
import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { auth } from "../../../firebaseConfig"; // Importe o auth do Firebase
// import "../../styles/Menu.css";
import logo from "../../../assets/logo.png";

const ManagerLayout = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await auth.signOut(); // Realiza o logout
      navigate("/login"); // Redireciona para a página de login
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <div>
      <header className="header">
        <img src={logo} alt="Logo" className="logo" />
        <nav>
          <ul>
            <li>
              <Link to="/manager/dashboard">Dashboard</Link>
            </li>
            <li>
              <Link to="/manager/approvals">Aprovações</Link>
            </li>
            <li>
              <Link to="managerteam">Equipe</Link>
            </li>
            <li>
              <span className="logout" onClick={handleLogout}>
                Sair
              </span>
            </li>
          </ul>
        </nav>
      </header>

      <main>
        <Outlet /> {/* Renderiza o conteúdo da rota aqui */}
      </main>
    </div>
  );
};

export default ManagerLayout;
