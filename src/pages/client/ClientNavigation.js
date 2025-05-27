import React, { useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowPathIcon,
  DocumentCheckIcon,
} from "@heroicons/react/24/outline";

const ClientNavigation = ({
  activeLink,
  setActiveLink,
  unreadCount = 0,
  unreadBudgetCount = 0,
  unreadApprovalCount = 0,
}) => {
  const navigate = useNavigate();
  const navRef = useRef(null);
  const activeLinkRef = useRef(null);

  const handleNavigation = (path, link) => (e) => {
    e.preventDefault();
    setActiveLink(link);
    navigate(path);
  };

  useEffect(() => {
    if (activeLinkRef.current && navRef.current) {
      const nav = navRef.current;
      const activeElement = activeLinkRef.current;
      const navRect = nav.getBoundingClientRect();
      const activeRect = activeElement.getBoundingClientRect();

      // Verifica se o elemento ativo está visível
      const isVisible =
        activeRect.left >= navRect.left && activeRect.right <= navRect.right;

      if (!isVisible) {
        // Calcula a posição de rolagem necessária para centralizar o elemento ativo
        const scrollLeft =
          activeElement.offsetLeft - navRect.width / 2 + activeRect.width / 2;

        nav.scrollTo({
          left: scrollLeft,
          behavior: "smooth",
        });
      }
    }
  }, [activeLink]);

  return (
    <div
      ref={navRef}
      className="flex w-full mb-6 border-b border-gray-200 overflow-x-auto scroll-smooth md:justify-center"
    >
      <span
        ref={activeLink === "projects" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects", "projects")}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "projects" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <FolderIcon className="w-5 h-5" />
        <span className="relative">
          Todos Projetos
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[11px] w-[17px] h-[17px] flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
      </span>
      <span
        ref={activeLink === "projects-budget" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-budget", "projects-budget")}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "projects-budget"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ClipboardDocumentCheckIcon className="w-5 h-5" />
        <span className="relative">
          Aguardando Orçamento
          {unreadBudgetCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[11px] w-[17px] h-[17px] flex items-center justify-center rounded-full">
              {unreadBudgetCount}
            </span>
          )}
        </span>
      </span>
      <span
        ref={activeLink === "projects-budget-received" ? activeLinkRef : null}
        onClick={handleNavigation(
          "/client/projects-budget-received",
          "projects-budget-received"
        )}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "projects-budget-received"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <DocumentCheckIcon className="w-5 h-5" />
        <span className="relative">
          Orçamento Recebido
          {unreadApprovalCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[11px] w-[17px] h-[17px] flex items-center justify-center rounded-full">
              {unreadApprovalCount}
            </span>
          )}
        </span>
      </span>
      <span
        ref={activeLink === "going-on" ? activeLinkRef : null}
        onClick={handleNavigation("/client/going-on", "going-on")}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "going-on" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <ArrowPathIcon className="w-5 h-5" />
        Em Andamento
      </span>
      <span
        ref={activeLink === "projects-analysis" ? activeLinkRef : null}
        onClick={handleNavigation(
          "/client/projects-analysis",
          "projects-analysis"
        )}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "projects-analysis"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ClipboardDocumentCheckIcon className="w-5 h-5" />
        Em Análise
      </span>
      <span
        ref={activeLink === "projects-done" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-done", "projects-done")}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "projects-done"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CheckCircleIcon className="w-5 h-5" />
        Projetos Concluídos
      </span>
      <span
        ref={activeLink === "projects-paid" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-paid", "projects-paid")}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "projects-paid"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CurrencyDollarIcon className="w-5 h-5" />
        Projetos Pagos
      </span>
      <span
        ref={activeLink === "payments" ? activeLinkRef : null}
        onClick={handleNavigation("/client/payments", "payments")}
        className={`nav-link flex items-center justify-center gap-2 w-full h-[40px] md:w-auto md:min-w-[180px] ${
          activeLink === "payments" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <CreditCardIcon className="w-5 h-5" />
        Pagamentos Pendentes
      </span>
    </div>
  );
};

export default ClientNavigation;
