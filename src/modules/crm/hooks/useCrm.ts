import { useState, useEffect, useCallback } from 'react';
import { crmApi } from '../api';
import { useAuthStore } from '@/modules/auth/store';
import type { Lead, Opportunity, Task, Activity } from '../types';

export function useLeads(companyId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
      const res = await crmApi.getLeads(companyId, ownedByUserId);
      if (res.success && res.data) setLeads(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
    const res = await crmApi.getLeads(companyId, ownedByUserId);
    if (res.success && res.data) setLeads(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Lead, 'id' | 'createdAt'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.createLead(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Lead, 'id' | 'companyId'>>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.updateLead(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteLead(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const convertToCustomer = useCallback(async (id: string, customerData: Record<string, unknown>) => {
    const res = await crmApi.convertLeadToCustomer(id, companyId, customerData);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { leads, isLoading, refresh, create, update, remove, convertToCustomer };
}

export function useOpportunities(companyId: string) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
      const res = await crmApi.getOpportunities(companyId, ownedByUserId);
      if (res.success && res.data) setOpportunities(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
    const res = await crmApi.getOpportunities(companyId, ownedByUserId);
    if (res.success && res.data) setOpportunities(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Opportunity, 'id' | 'createdAt'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.createOpportunity(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Opportunity, 'id' | 'companyId'>>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.updateOpportunity(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteOpportunity(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { opportunities, isLoading, refresh, create, update, remove };
}

export function useTasks(companyId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
      const res = await crmApi.getTasks(companyId, ownedByUserId);
      if (res.success && res.data) setTasks(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
    const res = await crmApi.getTasks(companyId, ownedByUserId);
    if (res.success && res.data) setTasks(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Task, 'id' | 'createdAt'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.createTask(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Task, 'id' | 'companyId'>>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.updateTask(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteTask(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { tasks, isLoading, refresh, create, update, remove };
}

export function useActivities(companyId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
      const res = await crmApi.getActivities(companyId, ownedByUserId);
      if (res.success && res.data) setActivities(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('crm') ? auth.user?.id : undefined;
    const res = await crmApi.getActivities(companyId, ownedByUserId);
    if (res.success && res.data) setActivities(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Activity, 'id' | 'createdAt'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.createActivity(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Activity, 'id' | 'companyId'>>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await crmApi.updateActivity(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteActivity(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { activities, isLoading, refresh, create, update, remove };
}
