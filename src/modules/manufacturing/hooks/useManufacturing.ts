import { useState, useEffect, useCallback } from 'react';
import { manufacturingApi } from '../api';
import { useAuthStore } from '@/modules/auth/store';
import type { BOM, WorkOrder, WorkOrderVariance } from '../types';

export function useBoms(companyId: string) {
  const [boms, setBoms] = useState<BOM[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('manufacturing') ? auth.user?.id : undefined;
      const res = await manufacturingApi.getBoms(companyId, ownedByUserId);
      if (res.success && res.data) setBoms(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('manufacturing') ? auth.user?.id : undefined;
    const res = await manufacturingApi.getBoms(companyId, ownedByUserId);
    if (res.success && res.data) setBoms(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<BOM, 'id'> & { lines: { materialId: string; quantity: number; unitCost?: number }[] }) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await manufacturingApi.createBom(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<BOM, 'id' | 'companyId'>> & { lines?: Partial<{ materialId: string; quantity: number; unitCost?: number }>[] }) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await manufacturingApi.updateBom(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await manufacturingApi.deleteBom(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { boms, isLoading, refresh, create, update, remove };
}

export function useWorkOrders(companyId: string) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('manufacturing') ? auth.user?.id : undefined;
      const res = await manufacturingApi.getWorkOrders(companyId, ownedByUserId);
      if (res.success && res.data) setWorkOrders(res.data);
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const refresh = useCallback(async () => {
    if (!companyId) return;
    setIsLoading(true);
    const auth = useAuthStore.getState();
    const ownedByUserId = auth.shouldFilterByOwner('manufacturing') ? auth.user?.id : undefined;
    const res = await manufacturingApi.getWorkOrders(companyId, ownedByUserId);
    if (res.success && res.data) setWorkOrders(res.data);
    setIsLoading(false);
  }, [companyId]);

  const create = useCallback(async (data: Omit<WorkOrder, 'id'> & { lines: { materialId: string; plannedQuantity: number; unitCost?: number }[] }) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await manufacturingApi.createWorkOrder(data, userId);
    if (res.success) await refresh();
    return res;
  }, [refresh]);

  const update = useCallback(async (id: string, data: Partial<Omit<WorkOrder, 'id' | 'companyId'>> & { lines?: Partial<WorkOrderLine>[] }) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const res = await manufacturingApi.updateWorkOrder(id, companyId, userId, data);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const remove = useCallback(async (id: string) => {
    const res = await manufacturingApi.deleteWorkOrder(id, companyId);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  const changeStatus = useCallback(async (id: string, status: WorkOrder['status']) => {
    const res = await manufacturingApi.updateWorkOrderStatus(id, companyId, status);
    if (res.success) await refresh();
    return res;
  }, [refresh, companyId]);

  return { workOrders, isLoading, refresh, create, update, remove, changeStatus };
}

interface WorkOrderLine {
  materialId: string;
  plannedQuantity: number;
  unitCost?: number;
}

export function useWorkOrderVariance(workOrderId: string) {
  const [variances, setVariances] = useState<WorkOrderVariance[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workOrderId) return;
    async function load() {
      setIsLoading(true);
      const res = await manufacturingApi.getWorkOrderById(workOrderId);
      if (res.success && res.data) {
        const lines = res.data.lines;
        const mapped = lines.map((l) => {
          const plannedQty = l.plannedQuantity || 0;
          const actualQty = l.actualQuantity || 0;
          const plannedCost = plannedQty * (l.unitCost || 0);
          const actualCost = actualQty * (l.actualUnitCost || l.unitCost || 0);
          return {
            materialName: l.materialName || l.materialId,
            plannedQty,
            actualQty,
            varianceQty: actualQty - plannedQty,
            plannedCost,
            actualCost,
            varianceCost: actualCost - plannedCost,
          };
        });
        setVariances(mapped);
      }
      setIsLoading(false);
    }
    load();
  }, [workOrderId]);

  return { variances, isLoading };
}
