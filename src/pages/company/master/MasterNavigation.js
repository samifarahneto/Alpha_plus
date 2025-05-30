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

const MasterNavigation = ({
  activeLink,
  setActiveLink,
  unreadCount = 0,
  unreadBudgetCount = 0,
  unreadApprovalCount = 0,
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center gap-1 xl:gap-2 mb-6 border-b border-gray-200 px-2 lg:px-4 overflow-x-auto">
      <span
        onClick={() => {
          setActiveLink("masterProjects");
          navigate("/company/master/projects");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "masterProjects"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <FolderIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="relative text-xs xl:text-sm font-medium whitespace-nowrap">
          Todos Projetos
          {unreadCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] xl:text-[11px] w-[15px] h-[15px] xl:w-[17px] xl:h-[17px] flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("projectsBudget");
          navigate("/company/master/projects-budget");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "projectsBudget"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ClipboardDocumentCheckIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="relative text-xs xl:text-sm font-medium whitespace-nowrap">
          Aguardando Orçamento
          {unreadBudgetCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] xl:text-[11px] w-[15px] h-[15px] xl:w-[17px] xl:h-[17px] flex items-center justify-center rounded-full">
              {unreadBudgetCount}
            </span>
          )}
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("projectsApproval");
          navigate("/company/master/projects-approval");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "projectsApproval"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <ClipboardDocumentCheckIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="relative text-xs xl:text-sm font-medium whitespace-nowrap">
          Aguardando Aprovação
          {unreadApprovalCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[10px] xl:text-[11px] w-[15px] h-[15px] xl:w-[17px] xl:h-[17px] flex items-center justify-center rounded-full">
              {unreadApprovalCount}
            </span>
          )}
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("projectsCanceled");
          navigate("/company/master/projects-approved");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "projectsCanceled"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CheckCircleIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium whitespace-nowrap">
          Aprovados
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("ongoing");
          navigate("/company/master/ongoing");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "ongoing" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <ArrowPathIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium whitespace-nowrap">
          Em Andamento
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("projectsDone");
          navigate("/company/master/projects-done");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "projectsDone"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CheckCircleIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium whitespace-nowrap">
          Projetos Concluídos
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("projectsPaid");
          navigate("/company/master/projects-paid");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "projectsPaid"
            ? "nav-link-active"
            : "nav-link-inactive"
        }`}
      >
        <CurrencyDollarIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium whitespace-nowrap">
          Projetos Pagos
        </span>
      </span>
      <span
        onClick={() => {
          setActiveLink("payments");
          navigate("/company/master/payments");
        }}
        className={`nav-link flex items-center justify-center gap-1 xl:gap-2 min-w-[140px] lg:min-w-[160px] xl:min-w-[180px] h-[40px] px-2 xl:px-4 ${
          activeLink === "payments" ? "nav-link-active" : "nav-link-inactive"
        }`}
      >
        <CreditCardIcon className="w-4 h-4 xl:w-5 xl:h-5 flex-shrink-0" />
        <span className="text-xs xl:text-sm font-medium whitespace-nowrap">
          Pagamentos Pendentes
        </span>
      </span>
    </div>
  );
};

export default MasterNavigation;
