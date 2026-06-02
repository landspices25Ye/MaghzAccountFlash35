import { useState, useEffect, useCallback } from 'react';
import { accountingApi } from '../api';
import { useAuthStore } from '@/modules/auth/store';
import type { Account, Transaction, TrialBalanceRow, LedgerRow, ReceiptVoucher, PaymentVoucher } from '../types';

export function useAccounts(companyId: string) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('accounting') ? auth.user?.id : undefined;
      const result = await accountingApi.getAccounts(companyId, ownedByUserId);
      if (result.success && result.data) {
        setAccounts(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Account, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.createAccount(data, userId);
    if (result.success && result.id) {
      setAccounts(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Account>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.updateAccount(id, companyId, userId, data);
    if (result.success) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await accountingApi.deleteAccount(id, companyId);
    if (result.success) {
      setAccounts(prev => prev.filter(a => a.id !== id));
    }
    return result;
  }, [companyId]);

  return { accounts, isLoading, create, update, remove };
}

export function useTransactions(companyId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('accounting') ? auth.user?.id : undefined;
      const result = await accountingApi.getTransactions(companyId, ownedByUserId);
      if (result.success && result.data) {
        setTransactions(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Transaction, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.createTransaction(data, userId);
    if (result.success && result.id) {
      setTransactions(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Transaction>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.updateTransaction(id, companyId, userId, data);
    if (result.success) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }
    return result;
  }, [companyId]);

  const post = useCallback(async (id: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.postTransaction(id, companyId, userId);
    if (result.success) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'posted' } : t));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await accountingApi.deleteTransaction(id, companyId);
    if (result.success) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
    return result;
  }, [companyId]);

  return { transactions, isLoading, create, update, post, remove };
}

export function useTrialBalance(companyId: string, asOfDate?: string) {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getTrialBalance(companyId, asOfDate);
      if (result.success && result.data) {
        setRows(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId, asOfDate]);

  return { rows, isLoading };
}

export function useAccountLedger(accountId: string, companyId: string, startDate?: string, endDate?: string) {
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!accountId || !companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getAccountLedger(accountId, companyId, startDate, endDate);
      if (result.success && result.data) {
        setRows(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [accountId, companyId, startDate, endDate]);

  return { rows, isLoading };
}

export function useReceiptVouchers(companyId: string) {
  const [vouchers, setVouchers] = useState<ReceiptVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('accounting') ? auth.user?.id : undefined;
      const result = await accountingApi.getReceiptVouchers(companyId, ownedByUserId);
      if (result.success && result.data) {
        setVouchers(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<ReceiptVoucher, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.createReceiptVoucher(data, userId);
    if (result.success && result.id) {
      setVouchers(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<ReceiptVoucher>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.updateReceiptVoucher(id, companyId, userId, data);
    if (result.success) {
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await accountingApi.deleteReceiptVoucher(id, companyId);
    if (result.success) {
      setVouchers(prev => prev.filter(v => v.id !== id));
    }
    return result;
  }, [companyId]);

  return { vouchers, isLoading, create, update, remove };
}

export function usePaymentVouchers(companyId: string) {
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('accounting') ? auth.user?.id : undefined;
      const result = await accountingApi.getPaymentVouchers(companyId, ownedByUserId);
      if (result.success && result.data) {
        setVouchers(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<PaymentVoucher, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.createPaymentVoucher(data, userId);
    if (result.success && result.id) {
      setVouchers(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<PaymentVoucher>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await accountingApi.updatePaymentVoucher(id, companyId, userId, data);
    if (result.success) {
      setVouchers(prev => prev.map(v => v.id === id ? { ...v, ...data } : v));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await accountingApi.deletePaymentVoucher(id, companyId);
    if (result.success) {
      setVouchers(prev => prev.filter(v => v.id !== id));
    }
    return result;
  }, [companyId]);

  return { vouchers, isLoading, create, update, remove };
}
