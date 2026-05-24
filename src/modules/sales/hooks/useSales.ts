import { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../api';
import type { Customer, SalesInvoice } from '../types';

export function useCustomers(companyId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await salesApi.getCustomers(companyId);
      if (result.success && result.data) {
        setCustomers(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Customer, 'id'>) => {
    const result = await salesApi.createCustomer(data);
    if (result.success && result.id) {
      setCustomers(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  return { customers, isLoading, create };
}

export function useInvoices(companyId: string) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await salesApi.getInvoices(companyId);
      if (result.success && result.data) {
        setInvoices(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<SalesInvoice, 'id'>) => {
    const result = await salesApi.createInvoice(data);
    if (result.success && result.id) {
      setInvoices(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  return { invoices, isLoading, create };
}
