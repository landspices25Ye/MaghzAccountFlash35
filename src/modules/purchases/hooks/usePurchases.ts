import { useState, useEffect, useCallback } from 'react';
import { purchasesApi } from '../api';
import type { Supplier, PurchaseInvoice, PurchaseOrder } from '../types';

export function useSuppliers(companyId: string) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await purchasesApi.getSuppliers(companyId);
      if (result.success && result.data) {
        setSuppliers(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Supplier, 'id'>) => {
    const result = await purchasesApi.createSupplier(data);
    if (result.success && result.id) {
      setSuppliers(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  return { suppliers, isLoading, create };
}

export function usePurchaseInvoices(companyId: string) {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await purchasesApi.getInvoices(companyId);
      if (result.success && result.data) {
        setInvoices(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<PurchaseInvoice, 'id'>) => {
    const result = await purchasesApi.createInvoice(data);
    if (result.success && result.id) {
      setInvoices(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  return { invoices, isLoading, create };
}

export function usePurchaseOrders(companyId: string) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await purchasesApi.getOrders(companyId);
      if (result.success && result.data) {
        setOrders(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<PurchaseOrder, 'id'>) => {
    const result = await purchasesApi.createOrder(data);
    if (result.success && result.id) {
      setOrders(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  return { orders, isLoading, create };
}
