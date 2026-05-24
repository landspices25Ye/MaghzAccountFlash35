import { useState, useEffect } from 'react';
import { getDbAdapter } from '@/core/database/adapters';
import type { Lead, Opportunity } from '../types';

export function useLeads(companyId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM leads WHERE company_id = $1 ORDER BY name', [companyId]);
      if (result.success && result.rows) setLeads(result.rows as Lead[]);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { leads, isLoading };
}

export function useOpportunities(companyId: string) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM opportunities WHERE company_id = $1 ORDER BY name', [companyId]);
      if (result.success && result.rows) setOpportunities(result.rows as Opportunity[]);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { opportunities, isLoading };
}
