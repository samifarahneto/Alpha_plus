import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  FaList,
  FaClock,
  FaCheckCircle,
  FaCheck,
  FaSpinner,
  FaCheckDouble,
  FaMoneyBillWave,
  FaCreditCard,
} from "react-icons/fa";

const NavigationLinks = ({
  activeLink,
  setActiveLink,
  unreadCount = 0,
  unreadBudgetCount = 0,
  unreadApprovalCount = 0,
}) => {
  const location = useLocation();

  useEffect(() => {
    const pathToId = {
      "/company/master/projects": "masterProjects",
      "/company/master/projects-budget": "projectsBudget",
      "/company/master/projects-approval": "projectsApproval",
      "/company/master/projects-approved": "projectsCanceled",
      "/company/master/projects-in-analysis": "projectsInAnalysis",
      "/company/master/ongoing": "ongoing",
      "/company/master/projects-done": "projectsDone",
      "/company/master/projects-paid": "projectsPaid",
      "/company/master/payments": "payments",
    };

    const currentPath = location.pathname;
    const newActiveLink = pathToId[currentPath];

    if (newActiveLink && newActiveLink !== activeLink) {
      setActiveLink(newActiveLink);
    }
  }, [location.pathname, setActiveLink, activeLink]);

  const links = [
    {
      id: "masterProjects",
      path: "/company/master/projects",
      label: "Todos Projetos",
      badge: unreadCount,
      icon: <FaList className="w-4 h-4" />,
    },
    {
      id: "projectsBudget",
      path: "/company/master/projects-budget",
      label: "Aguardando Orçamento",
      badge: unreadBudgetCount,
      icon: <FaClock className="w-4 h-4" />,
    },
    {
      id: "projectsApproval",
      path: "/company/master/projects-approval",
      label: "Aguardando Aprovação",
      badge: unreadApprovalCount,
      icon: <FaCheckCircle className="w-4 h-4" />,
    },
    {
      id: "projectsCanceled",
      path: "/company/master/projects-approved",
      label: "Aprovados",
      icon: <FaCheck className="w-4 h-4" />,
    },
    {
      id: "projectsInAnalysis",
      path: "/company/master/projects-in-analysis",
      label: "Em Análise",
      icon: <FaSpinner className="w-4 h-4" />,
    },
    {
      id: "ongoing",
      path: "/company/master/ongoing",
      label: "Em Andamento",
      icon: <FaSpinner className="w-4 h-4" />,
    },
    {
      id: "projectsDone",
      path: "/company/master/projects-done",
      label: "Projetos Concluídos",
      icon: <FaCheckDouble className="w-4 h-4" />,
    },
    {
      id: "projectsPaid",
      path: "/company/master/projects-paid",
      label: "Projetos Pagos",
      icon: <FaMoneyBillWave className="w-4 h-4" />,
    },
    {
      id: "payments",
      path: "/company/master/payments",
      label: "Pagamentos Pendentes",
      icon: <FaCreditCard className="w-4 h-4" />,
    },
  ];

  return (
    <div className="flex justify-center mb-8 overflow-x-auto">
      <div className="flex flex-col items-center">
        <div className="flex relative">
          {links.map((link, index) => (
            <div key={link.id} className="flex flex-col">
              <Link
                to={link.path}
                onClick={() => setActiveLink(link.id)}
                className={`flex items-center gap-2 px-4 py-3 relative transition-all duration-200 whitespace-nowrap ${
                  activeLink === link.id
                    ? "text-blue-600 font-semibold"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                {link.icon}
                <span className="text-sm">{link.label}</span>
                {link.badge > 0 && (
                  <span className="flex items-center justify-center min-w-[20px] h-5 px-1 text-xs font-medium text-white bg-red-500 rounded-full">
                    {link.badge}
                  </span>
                )}
              </Link>
              <div
                className={`h-[2px] transition-all duration-200 ${
                  activeLink === link.id ? "bg-blue-600" : "bg-transparent"
                }`}
              />
            </div>
          ))}
          <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gray-200" />
        </div>
      </div>
    </div>
  );
};

export default NavigationLinks;
