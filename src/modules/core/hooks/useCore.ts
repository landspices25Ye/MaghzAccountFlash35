import { useState, useEffect, useCallback } from 'react';
import { coreApi } from '../api';
import type { Company, Currency, VatSetting, Branch } from '../types';

export function useCompany() {
  const [company, setCompany] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      const result = await coreApi.getCompany();
      if (result.success && result.data) {
        setCompany(result.data);
      } else {
        setError(result.error || 'Failed to load company');
      }
      setIsLoading(false);
    }
    load();
  }, []);

  const update = useCallback(async (data: Partial<Company>) => {
    if (!company) return { success: false };
    const result = await coreApi.updateCompany({ ...company, ...data });
    if (result.success) {
      setCompany({ ...company, ...data });
    }
    return result;
  }, [company]);

  return { company, isLoading, error, update };
}

export function useCurrencies(companyId: string) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await coreApi.getCurrencies(companyId);
      if (result.success && result.data) {
        setCurrencies(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Currency, 'id'>) => {
    const result = await coreApi.createCurrency(data);
    if (result.success && result.id) {
      setCurrencies(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Currency>) => {
    const result = await coreApi.updateCurrency(id, data);
    if (result.success) {
      setCurrencies(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    }
    return result;
  }, []);

  return { currencies, isLoading, create, update };
}

export function useVatSettings(companyId: string) {
  const [settings, setSettings] = useState<VatSetting | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await coreApi.getVatSettings(companyId);
      if (result.success && result.data) {
        setSettings(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const update = useCallback(async (data: Partial<VatSetting>) => {
    if (!settings) return { success: false };
    const result = await coreApi.updateVatSettings({ ...settings, ...data });
    if (result.success) {
      setSettings({ ...settings, ...data });
    }
    return result;
  }, [settings]);

  return { settings, isLoading, update };
}

export function useBranches(companyId: string) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await coreApi.getBranches(companyId);
      if (result.success && result.data) {
        setBranches(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Branch, 'id'>) => {
    const result = await coreApi.createBranch(data);
    if (result.success && result.id) {
      setBranches(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Branch>) => {
    const result = await coreApi.updateBranch(id, data);
    if (result.success) {
      setBranches(prev => prev.map(b => b.id === id ? { ...b, ...data } : b));
    }
    return result;
  }, []);

  return { branches, isLoading, create, update };
}
