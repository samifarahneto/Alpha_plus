import React from "react";
import { useNavigate } from "react-router-dom";
import {
  FolderIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

const ClientNavigation = ({
  activeLink,
  setActiveLink,
  unreadCount = 0,
  unreadBudgetCount = 0,
  unreadApprovalCount = 0,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center gap-2 mb-6 border-b border-gray-200 px-4 overflow-x-auto">
      <span
        onClick={() => {
          setActiveLink("projects");
          navigate("/client/projects");
        }}
        className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
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
        onClick={() => {
          setActiveLink("projects-budget");
          navigate("/client/projects-budget");
        }}
        className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
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
        onClick={() => {
          setActiveLink("going-on");
          navigate("/client/going-on");
        }}
        className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
          activeLink === "going-on" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <ArrowPathIcon className="w-5 h-5" />
        Em Andamento
      </span>
      <span
        onClick={() => {
          setActiveLink("projects-done");
          navigate("/client/projects-done");
        }}
        className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
          activeLink === "projects-done"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CheckCircleIcon className="w-5 h-5" />
        Projetos Concluídos
      </span>
      <span
        onClick={() => {
          setActiveLink("projects-paid");
          navigate("/client/projects-paid");
        }}
        className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
          activeLink === "projects-paid"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CurrencyDollarIcon className="w-5 h-5" />
        Projetos Pagos
      </span>
      <span
        onClick={() => {
          setActiveLink("payments");
          navigate("/client/payments");
        }}
        className={`nav-link flex items-center justify-center gap-2 min-w-[180px] h-[40px] px-4 ${
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
