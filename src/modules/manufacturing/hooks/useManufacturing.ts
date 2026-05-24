import { useState, useEffect } from 'react';
import { getDbAdapter } from '@/core/database/adapters';
import type { BOM, WorkOrder } from '../types';

export function useBoms(companyId: string) {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM bills_of_materials WHERE company_id = $1', [companyId]);
      if (result.success && result.rows) setBoms(result.rows as BOM[]);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { boms, isLoading };
}

export function useWorkOrders(companyId: string) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM work_orders WHERE company_id = $1 ORDER BY order_number', [companyId]);
      if (result.success && result.rows) setWorkOrders(result.rows as WorkOrder[]);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { workOrders, isLoading };
}
