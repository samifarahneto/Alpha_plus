import React, { createContext, useContext, useState } from "react";

const UnreadCountContext = createContext();

export const useUnreadCount = () => {
  const context = useContext(UnreadCountContext);
  if (!context) {
    throw new Error(
      "useUnreadCount deve ser usado dentro de um UnreadCountProvider"
    );
  }
  return context;
};

export const UnreadCountProvider = ({ children }) => {
  const [unreadCount, setUnreadCount] = useState(0);

  return (
    <UnreadCountContext.Provider value={{ unreadCount, setUnreadCount }}>
      {children}
    </UnreadCountContext.Provider>
  );
};
