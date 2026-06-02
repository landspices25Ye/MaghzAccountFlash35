import { useState, useEffect, useCallback } from 'react';
import { hrApi } from '../api';
import { useAuthStore } from '@/modules/auth/store';
import type { Employee, AttendanceRecord, PayrollRun, Leave, EndOfService } from '../types';

export function useEmployees(companyId: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
      const res = await hrApi.getEmployees(companyId, ownedByUserId);
      if (res.success && res.data) setEmployees(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
    const res = await hrApi.getEmployees(companyId, ownedByUserId);
    if (res.success && res.data) setEmployees(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Employee, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await hrApi.createEmployee(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Employee, 'id' | 'companyId'>>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await hrApi.updateEmployee(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteEmployee(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { employees, isLoading, refresh, create, update, remove };
}

export function useAttendance(companyId: string, month: number, year: number) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
      const res = await hrApi.getAttendance(companyId, month, year, ownedByUserId);
      if (res.success && res.data) setRecords(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId, month, year]);

  const save = useCallback(async (data: Omit<AttendanceRecord, 'id'>[]) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await hrApi.saveAttendance(data, userId);
    return res;
  }, []);

  return { records, isLoading, save };
}

export function usePayrollRuns(companyId: string) {
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
      const res = await hrApi.getPayrollRuns(companyId, ownedByUserId);
      if (res.success && res.data) setPayrolls(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
    const res = await hrApi.getPayrollRuns(companyId, ownedByUserId);
    if (res.success && res.data) setPayrolls(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<PayrollRun, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await hrApi.createPayrollRun(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const post = useCallback(async (id: string) => {
    const res = await hrApi.postPayrollRun(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { payrolls, isLoading, refresh, create, post };
}

export function useLeaves(companyId: string) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
      const res = await hrApi.getLeaves(companyId, ownedByUserId);
      if (res.success && res.data) setLeaves(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
    const res = await hrApi.getLeaves(companyId, ownedByUserId);
    if (res.success && res.data) setLeaves(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Leave, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await hrApi.createLeave(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const updateStatus = useCallback(async (id: string, status: Leave['status'], approvedBy?: string) => {
    const res = await hrApi.updateLeaveStatus(id, companyId, status, approvedBy);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteLeave(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { leaves, isLoading, refresh, create, updateStatus, remove };
}

export function useEndOfServices(companyId: string) {
  const [items, setItems] = useState<EndOfService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
      const res = await hrApi.getEndOfServices(companyId, ownedByUserId);
      if (res.success && res.data) setItems(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('hr') ? auth.user?.id : undefined;
    const res = await hrApi.getEndOfServices(companyId, ownedByUserId);
    if (res.success && res.data) setItems(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<EndOfService, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await hrApi.createEndOfService(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const updateStatus = useCallback(async (id: string, status: EndOfService['status']) => {
    const res = await hrApi.updateEndOfServiceStatus(id, companyId, status);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteEndOfService(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { items, isLoading, refresh, create, updateStatus, remove };
}
