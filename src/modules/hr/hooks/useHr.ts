import { useState, useEffect, useCallback } from 'react';
import { hrApi } from '../api';
import { usePaginatedList } from '@/core/hooks/usePaginatedList';
import type { Employee, AttendanceRecord, PayrollRun, Leave, EndOfService } from '../types';

export function useEmployees(companyId: string) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    const res = await hrApi.updateEmployee(id, companyId, data);
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
  const [isLoading, setIsLoading] = useState(false);

  const load = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const res = await hrApi.getAttendance(companyId, month, year);
    if (res.success && res.data) setRecords(res.data);
    setIsLoading(false);
  }, [companyId, month, year]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async (data: Omit<AttendanceRecord, 'id'>[]) => {
    const res = await hrApi.saveAttendance(data);
    if (res.success) await load();
    return res;
  }, [load]);

  return { records, isLoading, save, refresh: load };
}

export function usePayrollRuns(companyId: string) {
  const [payrolls, setPayrolls] = useState<PayrollRun[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
    const res = await hrApi.postPayrollRun(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { payrolls, isLoading, refresh, create, post };
}

export interface PayrollFilters {
  status?: string;
}

export function usePayrollRunsPaginated(companyId: string, filters?: PayrollFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<PayrollRun>(
    (page, pageSize) => hrApi.getPayrollRunsPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.status]
  );

  const create = useCallback(async (data: Omit<PayrollRun, 'id'>) => {
    const res = await hrApi.createPayrollRun(data);
    if (res.success) await reloadList();
    return res;
  }, [reloadList]);

  const post = useCallback(async (id: string) => {
    const res = await hrApi.postPayrollRun(id, companyId);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  return {
    payrolls: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    isLoading: list.isLoading,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    post,
    reload: reloadList,
  };
}

export function useLeaves(companyId: string) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

export interface LeaveFilters {
  status?: string;
}

export function useLeavesPaginated(companyId: string, filters?: LeaveFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<Leave>(
    (page, pageSize) => hrApi.getLeavesPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.status]
  );

  const create = useCallback(async (data: Omit<Leave, 'id'>) => {
    const res = await hrApi.createLeave(data);
    if (res.success) await reloadList();
    return res;
  }, [reloadList]);

  const updateStatus = useCallback(async (id: string, status: Leave['status'], approvedBy?: string) => {
    const res = await hrApi.updateLeaveStatus(id, companyId, status, approvedBy);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteLeave(id, companyId);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  return {
    leaves: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    isLoading: list.isLoading,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    updateStatus,
    remove,
    reload: reloadList,
  };
}

export function useEndOfServices(companyId: string) {
  const [items, setItems] = useState<EndOfService[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

export interface EndOfServiceFilters {
  status?: string;
}

export function useEndOfServicesPaginated(companyId: string, filters?: EndOfServiceFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<EndOfService>(
    (page, pageSize) => hrApi.getEndOfServicesPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.status]
  );

  const create = useCallback(async (data: Omit<EndOfService, 'id'>) => {
    const res = await hrApi.createEndOfService(data);
    if (res.success) await reloadList();
    return res;
  }, [reloadList]);

  const updateStatus = useCallback(async (id: string, status: EndOfService['status']) => {
    const res = await hrApi.updateEndOfServiceStatus(id, companyId, status);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteEndOfService(id, companyId);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  return {
    items: list.items,
    total: list.total,
    page: list.page,
    pageSize: list.pageSize,
    isLoading: list.isLoading,
    goToPage: list.goToPage,
    changePageSize: list.changePageSize,
    create,
    updateStatus,
    remove,
    reload: reloadList,
  };
}

export interface EmployeeFilters {
  isActive?: boolean;
  departmentId?: string;
  search?: string;
}

export function useEmployeesPaginated(companyId: string, filters?: EmployeeFilters) {
  const { reload: reloadList, ...list } = usePaginatedList<Employee>(
    (page, pageSize) => hrApi.getEmployeesPaginated(companyId, page, pageSize, filters),
    [companyId, filters?.isActive, filters?.departmentId, filters?.search]
  );

  const create = useCallback(async (data: Omit<Employee, 'id'>) => {
    const res = await hrApi.createEmployee(data);
    if (res.success) await reloadList();
    return res;
  }, [reloadList]);

  const update = useCallback(async (id: string, data: Partial<Omit<Employee, 'id' | 'companyId'>>) => {
    const res = await hrApi.updateEmployee(id, companyId, data);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await hrApi.deleteEmployee(id, companyId);
    if (res.success) await reloadList();
    return res;
  }, [reloadList, companyId]);

  return {
    employees: list.items,
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
