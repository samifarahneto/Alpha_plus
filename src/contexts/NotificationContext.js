import React, { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotifications deve ser usado dentro de um NotificationProvider"
    );
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  // Estados para Master
  const [masterUnreadCount, setMasterUnreadCount] = useState(0);
  const [budgetCount, setBudgetCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [inAnalysisCount, setInAnalysisCount] = useState(0);
  const [onGoingCount, setOnGoingCount] = useState(0);

  // Estados para Cliente
  const [clientUnreadCount, setClientUnreadCount] = useState(0);
  const [clientBudgetCount, setClientBudgetCount] = useState(0);
  const [clientBudgetReadyCount, setClientBudgetReadyCount] = useState(0);
  const [clientDivergenceCount, setClientDivergenceCount] = useState(0);
  const [clientAnalysisCount, setClientAnalysisCount] = useState(0);
  const [clientGoingOnCount, setClientGoingOnCount] = useState(0);
  const [clientPaymentsCount, setClientPaymentsCount] = useState(0);

  // Funções de atualização Master
  const updateMasterUnreadCount = (count) => {
    setMasterUnreadCount(count);
  };

  const updateBudgetCount = (count) => {
    setBudgetCount(count);
  };

  const updateApprovalCount = (count) => {
    setApprovalCount(count);
  };

  const updateApprovedCount = (count) => {
    setApprovedCount(count);
  };

  const updateInAnalysisCount = (count) => {
    setInAnalysisCount(count);
  };

  const updateOnGoingCount = (count) => {
    setOnGoingCount(count);
  };

  // Funções de atualização Cliente
  const updateClientUnreadCount = useCallback((count) => {
    setClientUnreadCount((prev) => (prev !== count ? count : prev));
  }, []);

  const updateClientBudgetCount = useCallback((count) => {
    setClientBudgetCount((prev) => (prev !== count ? count : prev));
  }, []);

  const updateClientBudgetReadyCount = useCallback((count) => {
    setClientBudgetReadyCount((prev) => (prev !== count ? count : prev));
  }, []);

  const updateClientDivergenceCount = useCallback((count) => {
    setClientDivergenceCount((prev) => (prev !== count ? count : prev));
  }, []);

  const updateClientAnalysisCount = useCallback((count) => {
    setClientAnalysisCount((prev) => (prev !== count ? count : prev));
  }, []);

  const updateClientGoingOnCount = useCallback((count) => {
    setClientGoingOnCount((prev) => (prev !== count ? count : prev));
  }, []);

  const updateClientPaymentsCount = useCallback((count) => {
    setClientPaymentsCount((prev) => (prev !== count ? count : prev));
  }, []);

  const value = {
    // Estados Master
    masterUnreadCount,
    budgetCount,
    approvalCount,
    approvedCount,
    inAnalysisCount,
    onGoingCount,
    // Estados Cliente
    clientUnreadCount,
    clientBudgetCount,
    clientBudgetReadyCount,
    clientDivergenceCount,
    clientAnalysisCount,
    clientGoingOnCount,
    clientPaymentsCount,
    // Funções Master
    updateMasterUnreadCount,
    updateBudgetCount,
    updateApprovalCount,
    updateApprovedCount,
    updateInAnalysisCount,
    updateOnGoingCount,
    // Funções Cliente
    updateClientUnreadCount,
    updateClientBudgetCount,
    updateClientBudgetReadyCount,
    updateClientDivergenceCount,
    updateClientAnalysisCount,
    updateClientGoingOnCount,
    updateClientPaymentsCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
