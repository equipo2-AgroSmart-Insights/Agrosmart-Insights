import { createContext, useContext, useState } from "react";

const QueryContext = createContext(null);

export function QueryProvider({ children }) {
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const value = { status, setStatus, result, setResult, error, setError };
  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components -- hook compartido con componentes
export function useQueryContext() {
  const ctx = useContext(QueryContext);
  if (!ctx) throw new Error("useQueryContext debe usarse dentro de QueryProvider");
  return ctx;
}