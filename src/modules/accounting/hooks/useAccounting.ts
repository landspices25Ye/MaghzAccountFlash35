import { useState, useEffect, useCallback } from 'react';
import { accountingApi } from '../api';
import type { Account, Transaction, TrialBalanceRow } from '../types';

export function useAccounts(companyId: string) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getAccounts(companyId);
      if (result.success && result.data) {
        setAccounts(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Account, 'id'>) => {
    const result = await accountingApi.createAccount(data);
    if (result.success && result.id) {
      setAccounts(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Account>) => {
    const result = await accountingApi.updateAccount(id, data);
    if (result.success) {
      setAccounts(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    }
    return result;
  }, []);

  return { accounts, isLoading, create, update };
}

export function useTransactions(companyId: string) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getTransactions(companyId);
      if (result.success && result.data) {
        setTransactions(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Transaction, 'id'>) => {
    const result = await accountingApi.createTransaction(data);
    if (result.success && result.id) {
      setTransactions(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  const post = useCallback(async (id: string) => {
    const result = await accountingApi.postTransaction(id);
    if (result.success) {
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status: 'posted' } : t));
    }
    return result;
  }, []);

  return { transactions, isLoading, create, post };
}

export function useTrialBalance(companyId: string) {
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await accountingApi.getTrialBalance(companyId);
      if (result.success && result.data) {
        setRows(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { rows, isLoading };
}
