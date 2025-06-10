import React, { createContext, useContext, useState } from "react";

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
  const [masterUnreadCount, setMasterUnreadCount] = useState(0);
  const [budgetCount, setBudgetCount] = useState(0);
  const [approvalCount, setApprovalCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [inAnalysisCount, setInAnalysisCount] = useState(0);
  const [onGoingCount, setOnGoingCount] = useState(0);

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

  const value = {
    masterUnreadCount,
    budgetCount,
    approvalCount,
    approvedCount,
    inAnalysisCount,
    onGoingCount,
    updateMasterUnreadCount,
    updateBudgetCount,
    updateApprovalCount,
    updateApprovedCount,
    updateInAnalysisCount,
    updateOnGoingCount,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
