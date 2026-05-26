import { useState, useEffect, useCallback } from 'react';
import { crmApi } from '../api';
import type { Lead, Opportunity, Task, Activity } from '../types';

export function useLeads(companyId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await crmApi.getLeads(companyId);
      if (res.success && res.data) setLeads(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await crmApi.getLeads(companyId);
    if (res.success && res.data) setLeads(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Lead, 'id' | 'createdAt'>) => {
    const res = await crmApi.createLead(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Lead, 'id' | 'companyId'>>) => {
    const res = await crmApi.updateLead(id, data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteLead(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const convertToCustomer = useCallback(async (id: string, customerData: Record<string, unknown>) => {
    const res = await crmApi.convertLeadToCustomer(id, customerData);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { leads, isLoading, refresh, create, update, remove, convertToCustomer };
}

export function useOpportunities(companyId: string) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await crmApi.getOpportunities(companyId);
      if (res.success && res.data) setOpportunities(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await crmApi.getOpportunities(companyId);
    if (res.success && res.data) setOpportunities(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Opportunity, 'id' | 'createdAt'>) => {
    const res = await crmApi.createOpportunity(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Opportunity, 'id' | 'companyId'>>) => {
    const res = await crmApi.updateOpportunity(id, data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteOpportunity(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { opportunities, isLoading, refresh, create, update, remove };
}

export function useTasks(companyId: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await crmApi.getTasks(companyId);
      if (res.success && res.data) setTasks(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await crmApi.getTasks(companyId);
    if (res.success && res.data) setTasks(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Task, 'id' | 'createdAt'>) => {
    const res = await crmApi.createTask(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Task, 'id' | 'companyId'>>) => {
    const res = await crmApi.updateTask(id, data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteTask(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { tasks, isLoading, refresh, create, update, remove };
}

export function useActivities(companyId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await crmApi.getActivities(companyId);
      if (res.success && res.data) setActivities(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await crmApi.getActivities(companyId);
    if (res.success && res.data) setActivities(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Activity, 'id' | 'createdAt'>) => {
    const res = await crmApi.createActivity(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Activity, 'id' | 'companyId'>>) => {
    const res = await crmApi.updateActivity(id, data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await crmApi.deleteActivity(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { activities, isLoading, refresh, create, update, remove };
}
