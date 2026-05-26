import { useState, useEffect, useCallback } from 'react';
import { hrApi } from '../api';
import type { Employee, AttendanceRecord, PayrollRun, Leave, EndOfService } from '../types';

export function useEmployees(companyId: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await hrApi.getEmployees(companyId);
      if (res.success && res.data) setEmployees(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await hrApi.getEmployees(companyId);
    if (res.success && res.data) setEmployees(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Employee, 'id'>) => {
    const res = await hrApi.createEmployee(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<Employee, 'id' | 'companyId'>>) => {
    const res = await hrApi.updateEmployee(id, data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteEmployee(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { employees, isLoading, refresh, create, update, remove };
}

export function useAttendance(companyId: string, month: number, year: number) {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await hrApi.getAttendance(companyId, month, year);
      if (res.success && res.data) setRecords(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId, month, year]);

  const save = useCallback(async (data: Omit<AttendanceRecord, 'id'>[]) => {
    const res = await hrApi.saveAttendance(data);
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
      const res = await hrApi.getPayrollRuns(companyId);
      if (res.success && res.data) setPayrolls(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await hrApi.getPayrollRuns(companyId);
    if (res.success && res.data) setPayrolls(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<PayrollRun, 'id'>) => {
    const res = await hrApi.createPayrollRun(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const post = useCallback(async (id: string) => {
    const res = await hrApi.postPayrollRun(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { payrolls, isLoading, refresh, create, post };
}

export function useLeaves(companyId: string) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await hrApi.getLeaves(companyId);
      if (res.success && res.data) setLeaves(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await hrApi.getLeaves(companyId);
    if (res.success && res.data) setLeaves(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<Leave, 'id'>) => {
    const res = await hrApi.createLeave(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const updateStatus = useCallback(async (id: string, status: Leave['status'], approvedBy?: string) => {
    const res = await hrApi.updateLeaveStatus(id, status, approvedBy);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteLeave(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { leaves, isLoading, refresh, create, updateStatus, remove };
}

export function useEndOfServices(companyId: string) {
  const [items, setItems] = useState<EndOfService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const res = await hrApi.getEndOfServices(companyId);
      if (res.success && res.data) setItems(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await hrApi.getEndOfServices(companyId);
    if (res.success && res.data) setItems(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<EndOfService, 'id'>) => {
    const res = await hrApi.createEndOfService(data);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const updateStatus = useCallback(async (id: string, status: EndOfService['status']) => {
    const res = await hrApi.updateEndOfServiceStatus(id, status);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteEndOfService(id);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  return { items, isLoading, refresh, create, updateStatus, remove };
}
