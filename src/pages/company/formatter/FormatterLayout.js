// src/pages/company/master/MasterLayout.js
import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { auth } from "../../../firebaseConfig"; // Importe o auth do Firebase

const FormatterLayout = () => {
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
      <header>
        <nav>
          <ul>
            <li>
              <Link to="/company/master">Dashboard</Link>
            </li>
            <li>
              <Link to="overview">Visão Geral</Link>
            </li>
            <li>
              <Link to="team">Equipe</Link>
            </li>
            <li>
              <span className="logout" onClick={handleLogout}>
                Sair
              </span>
            </li>
          </ul>
        </nav>
      </header>
      <main style={{ marginTop: "60px", padding: "20px" }}>
        <Outlet /> {/* Renderiza o conteúdo da rota aqui */}
      </main>
    </div>
  );
};

export default FormatterLayout;
