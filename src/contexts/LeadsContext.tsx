import { createContext, useContext, useEffect, useState } from 'react';
import type { Lead } from '../types/lead';

interface LeadsContextValue {
  leads: Lead[];
  loading: boolean;
  error: string | null;
}

const LeadsContext = createContext<LeadsContextValue>({
  leads: [],
  loading: true,
  error: null,
});

export function LeadsProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const url = `${import.meta.env.BASE_URL}leads.json`;
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Lead[]>;
      })
      .then((data) => {
        setLeads(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load leads:', err);
        setError('Erro ao carregar dados do Pipedrive.');
        setLoading(false);
      });
  }, []);

  return (
    <LeadsContext.Provider value={{ leads, loading, error }}>
      {children}
    </LeadsContext.Provider>
  );
}

export function useLeads() {
  return useContext(LeadsContext);
}
