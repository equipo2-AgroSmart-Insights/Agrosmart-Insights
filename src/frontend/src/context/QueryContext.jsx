import { createContext, useContext, useMemo, useState } from 'react';
import { useNLQQuery } from '../hooks/useNLQQuery.js';

const QueryContext = createContext(null);

export function QueryProvider({ children }) {
  const [history, setHistory] = useState([]);
  const nlq = useNLQQuery();

  const value = useMemo(
    () => ({
      ...nlq,
      history,
      appendHistory: (entry) => setHistory((prev) => [entry, ...prev].slice(0, 10)),
    }),
    [nlq, history],
  );

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}

export function useQueryContext() {
  const ctx = useContext(QueryContext);
  if (!ctx) throw new Error('useQueryContext debe usarse dentro de QueryProvider');
  return ctx;
}
