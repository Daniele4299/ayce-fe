// app/(DashboardLayout)/ws/WSContext.tsx
'use client';

import React, { createContext, useContext, useState } from 'react';

type WSContextType = {
  wsConnesso: boolean;
  setWsConnesso: React.Dispatch<React.SetStateAction<boolean>>;
};

const WSContext = createContext<WSContextType | undefined>(undefined);

export const WSProvider = ({ children }: { children: React.ReactNode }) => {
  const [wsConnesso, setWsConnesso] = useState<boolean>(false); // default false
  return (
    <WSContext.Provider value={{ wsConnesso, setWsConnesso }}>
      {children}
    </WSContext.Provider>
  );
};

export const useWS = (): WSContextType => {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error('useWS must be used within WSProvider');
  return ctx;
};
