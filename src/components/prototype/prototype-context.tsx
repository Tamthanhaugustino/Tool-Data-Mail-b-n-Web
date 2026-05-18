"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { ApiConnectionStatus } from "@/lib/mock-data";

type PrototypeContextValue = {
  apiStatus: ApiConnectionStatus;
  setApiStatus: (s: ApiConnectionStatus) => void;
};

const PrototypeContext = createContext<PrototypeContextValue | null>(null);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [apiStatus, setApiStatus] = useState<ApiConnectionStatus>("ok");
  return (
    <PrototypeContext.Provider value={{ apiStatus, setApiStatus }}>
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  const ctx = useContext(PrototypeContext);
  if (!ctx) throw new Error("usePrototype must be used within PrototypeProvider");
  return ctx;
}
