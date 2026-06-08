import { useState, useEffect, useCallback } from 'react';
import { salesApi } from '../api';
import { usePaginatedList } from '@/core/hooks/usePaginatedList';
import type { Customer, SalesInvoice, Quotation, SalesReturn } from '../types';

export function useCustomers(companyId: string) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const result = await salesApi.getCustomers(companyId);
    if (result.success && result.data) setCustomers(result.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: Omit<Customer, 'id'>) => {
    const result = await salesApi.createCustomer(data);
    if (result.success) await load();
    return result;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<Omit<Customer, 'id' | 'companyId'>>) => {
    const result = await salesApi.updateCustomer(id, companyId, data);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteCustomer(id, companyId);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  return { customers, isLoading, create, update, remove, reload: load };
}

export interface CustomerFilters {
  search?: string;
  isActive?: boolean;
}

export function useCustomersPaginated(companyId: string, filters?: CustomerFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<Customer>(
    (page, pageSize) => salesApi.getCustomersPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.search, filters?.isActive]
  );

  const create = useCallback(async (data: Omit<Customer, 'id'>) => {
    const result = await salesApi.createCustomer(data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList]);

  const update = useCallback(async (id: string, data: Partial<Omit<Customer, 'id' | 'companyId'>>) => {
    const result = await salesApi.updateCustomer(id, companyId, data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteCustomer(id, companyId);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  return {
    customers: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    isLoading: list.isLoading,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    update,
    remove,
    reload: reloadList,
  };
}

export function useInvoices(companyId: string) {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const result = await salesApi.getInvoices(companyId);
    if (result.success && result.data) setInvoices(result.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: Omit<SalesInvoice, 'id'>) => {
    const result = await salesApi.createInvoice(data);
    if (result.success) await load();
    return result;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<Omit<SalesInvoice, 'id' | 'companyId'>> & { lines?: SalesInvoice['lines'] }) => {
    const result = await salesApi.updateInvoice(id, companyId, data);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteInvoice(id, companyId);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const post = useCallback(async (id: string) => {
    const result = await salesApi.postInvoice(id, companyId);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  return { invoices, isLoading, create, update, remove, post, reload: load };
}

export function useQuotations(companyId: string) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const result = await salesApi.getQuotations(companyId);
    if (result.success && result.data) setQuotations(result.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: Omit<Quotation, 'id'>) => {
    const result = await salesApi.createQuotation(data);
    if (result.success) await load();
    return result;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<Omit<Quotation, 'id' | 'companyId'>> & { lines?: Quotation['lines'] }) => {
    const result = await salesApi.updateQuotation(id, companyId, data);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteQuotation(id, companyId);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const convertToInvoice = useCallback(async (id: string, invoiceData: Omit<SalesInvoice, 'id'>) => {
    const result = await salesApi.convertQuotationToInvoice(id, companyId, invoiceData);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  return { quotations, isLoading, create, update, remove, convertToInvoice, reload: load };
}

export function useReturns(companyId: string) {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const result = await salesApi.getReturns(companyId);
    if (result.success && result.data) setReturns(result.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  const create = useCallback(async (data: Omit<SalesReturn, 'id'>) => {
    const result = await salesApi.createReturn(data);
    if (result.success) await load();
    return result;
  }, [load]);

  const update = useCallback(async (id: string, data: Partial<Omit<SalesReturn, 'id' | 'companyId'>> & { lines?: SalesReturn['lines'] }) => {
    const result = await salesApi.updateReturn(id, companyId, data);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteReturn(id, companyId);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  const post = useCallback(async (id: string) => {
    const result = await salesApi.postReturn(id, companyId);
    if (result.success) await load();
    return result;
  }, [load, companyId]);

  return { returns, isLoading, create, update, remove, post, reload: load };
}

export function useCustomerStatement(customerId: string) {
  const [rows, setRows] = useState<Array<{ date: string; documentType: string; documentNumber: string; debit: number; credit: number; balance: number; notes?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!customerId) return;
    setIsLoading(true);
    const result = await salesApi.getCustomerStatement(customerId);
    if (result.success && result.data) setRows(result.data);
    setIsLoading(false);
  }, [customerId]);

  useEffect(() => { load(); }, [load]);

  return { rows, isLoading, reload: load };
}

export function useCustomerArAging(companyId: string) {
  const [data, setData] = useState<Awaited<ReturnType<typeof salesApi.getCustomerArAging>>['data']>([]);
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const result = await salesApi.getCustomerArAging(companyId);
    if (result.success && result.data) setData(result.data);
    setIsLoading(false);
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  return { data: data || [], isLoading, reload: load };
}

export interface InvoiceFilters {
  status?: string;
  customerId?: string;
  createdBy?: string;
}

export function useInvoicesPaginated(companyId: string, filters?: InvoiceFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<SalesInvoice>(
    (page, pageSize) => salesApi.getInvoicesPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.status, filters?.customerId, filters?.createdBy]
  );

  const create = useCallback(async (data: Omit<SalesInvoice, 'id'>) => {
    const result = await salesApi.createInvoice(data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList]);

  const update = useCallback(async (id: string, data: Partial<Omit<SalesInvoice, 'id' | 'companyId'>> & { lines?: SalesInvoice['lines'] }) => {
    const result = await salesApi.updateInvoice(id, companyId, data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteInvoice(id, companyId);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const post = useCallback(async (id: string) => {
    const result = await salesApi.postInvoice(id, companyId);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  return {
    invoices: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    totalPages: list.totalPages,
    isLoading: list.isLoading,
    error: list.error,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    update,
    remove,
    post,
    reload: reloadList,
  };
}

export interface QuotationFilters {
  status?: string;
  customerId?: string;
}

export function useQuotationsPaginated(companyId: string, filters?: QuotationFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<Quotation>(
    (page, pageSize) => salesApi.getQuotationsPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.status, filters?.customerId]
  );

  const create = useCallback(async (data: Omit<Quotation, 'id'>) => {
    const result = await salesApi.createQuotation(data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList]);

  const update = useCallback(async (id: string, data: Partial<Omit<Quotation, 'id' | 'companyId'>> & { lines?: Quotation['lines'] }) => {
    const result = await salesApi.updateQuotation(id, companyId, data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteQuotation(id, companyId);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const convertToInvoice = useCallback(async (id: string, invoiceData: Omit<SalesInvoice, 'id'>) => {
    const result = await salesApi.convertQuotationToInvoice(id, companyId, invoiceData);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  return {
    quotations: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    isLoading: list.isLoading,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    update,
    remove,
    convertToInvoice,
    reload: reloadList,
  };
}

export interface ReturnFilters {
  status?: string;
  customerId?: string;
}

export function useReturnsPaginated(companyId: string, filters?: ReturnFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<SalesReturn>(
    (page, pageSize) => salesApi.getReturnsPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.status, filters?.customerId]
  );

  const create = useCallback(async (data: Omit<SalesReturn, 'id'>) => {
    const result = await salesApi.createReturn(data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList]);

  const update = useCallback(async (id: string, data: Partial<Omit<SalesReturn, 'id' | 'companyId'>> & { lines?: SalesReturn['lines'] }) => {
    const result = await salesApi.updateReturn(id, companyId, data);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await salesApi.deleteReturn(id, companyId);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  const post = useCallback(async (id: string) => {
    const result = await salesApi.postReturn(id, companyId);
    if (result.success) await reloadList();
    return result;
  }, [reloadList, companyId]);

  return {
    returns: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    isLoading: list.isLoading,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    update,
    remove,
    post,
    reload: reloadList,
  };
}
