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
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon,
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
      className="flex w-full mb-6 border-b border-gray-200 overflow-x-auto scroll-smooth lg:justify-center"
    >
      <span
        ref={activeLink === "projects" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects", "projects")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <FolderIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="relative text-xs xl:text-sm font-medium text-center leading-tight">
          Todos
          <br />
          Projetos
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] xl:text-[11px] w-[15px] h-[15px] xl:w-[17px] xl:h-[17px] flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
      </span>
      <span
        ref={activeLink === "projects-budget" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-budget", "projects-budget")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-budget"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ClipboardDocumentCheckIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="relative text-xs xl:text-sm font-medium text-center leading-tight">
          Aguardando
          <br />
          Orçamento
          {unreadBudgetCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] xl:text-[11px] w-[15px] h-[15px] xl:w-[17px] xl:h-[17px] flex items-center justify-center rounded-full">
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
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-budget-received"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <DocumentCheckIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="relative text-xs xl:text-sm font-medium text-center leading-tight">
          Orçamento
          <br />
          Recebido
          {unreadApprovalCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] xl:text-[11px] w-[15px] h-[15px] xl:w-[17px] xl:h-[17px] flex items-center justify-center rounded-full">
              {unreadApprovalCount}
            </span>
          )}
        </span>
      </span>
      <span
        ref={activeLink === "going-on" ? activeLinkRef : null}
        onClick={handleNavigation("/client/going-on", "going-on")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "going-on" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <ArrowPathIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Em
          <br />
          Andamento
        </span>
      </span>
      <span
        ref={activeLink === "projects-analysis" ? activeLinkRef : null}
        onClick={handleNavigation(
          "/client/projects-analysis",
          "projects-analysis"
        )}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-analysis"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ClipboardDocumentCheckIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Em
          <br />
          Análise
        </span>
      </span>
      <span
        ref={activeLink === "projects-done" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-done", "projects-done")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-done"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CheckCircleIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Projetos
          <br />
          Concluídos
        </span>
      </span>
      <span
        ref={activeLink === "projects-paid" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-paid", "projects-paid")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-paid"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CurrencyDollarIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Projetos
          <br />
          Pagos
        </span>
      </span>
      <span
        ref={activeLink === "payments" ? activeLinkRef : null}
        onClick={handleNavigation("/client/payments", "payments")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "payments" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <CreditCardIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Pagamentos
          <br />
          Pendentes
        </span>
      </span>
      <span
        ref={activeLink === "projects-refund" ? activeLinkRef : null}
        onClick={handleNavigation("/client/projects-refund", "projects-refund")}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-refund"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ArrowUturnLeftIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Em
          <br />
          Reembolso
        </span>
      </span>
      <span
        ref={activeLink === "projects-divergence" ? activeLinkRef : null}
        onClick={handleNavigation(
          "/client/projects-divergence",
          "projects-divergence"
        )}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 w-full h-[40px] lg:w-auto lg:min-w-[160px] xl:min-w-[180px] px-2 xl:px-4 ${
          activeLink === "projects-divergence"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ExclamationTriangleIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium text-center leading-tight">
          Em
          <br />
          Divergência
        </span>
      </span>
    </div>
  );
};

export default ClientNavigation;
