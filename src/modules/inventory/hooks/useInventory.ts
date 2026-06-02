import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../api';
import { useAuthStore } from '@/modules/auth/store';
import type { Product, Warehouse, Stock, StockItem, StockTransfer, InventoryTransaction, StockAdjustment, ProductCategory } from '../types';

export function useProducts(companyId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getProducts(companyId, ownedByUserId);
      if (result.success && result.data) {
        setProducts(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Product, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.createProduct(data, userId);
    if (result.success && result.id) {
      setProducts(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Product>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.updateProduct(id, companyId, userId, { ...data, updatedBy: userId });
    if (result.success) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await inventoryApi.deleteProduct(id, companyId);
    if (result.success) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
    return result;
  }, [companyId]);

  return { products, isLoading, create, update, remove };
}

export function useWarehouses(companyId: string) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getWarehouses(companyId, ownedByUserId);
      if (result.success && result.data) {
        setWarehouses(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Warehouse, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.createWarehouse(data, userId);
    if (result.success && result.id) {
      setWarehouses(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Warehouse>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.updateWarehouse(id, companyId, userId, data);
    if (result.success) {
      setWarehouses(prev => prev.map(w => w.id === id ? { ...w, ...data } : w));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await inventoryApi.deleteWarehouse(id, companyId);
    if (result.success) {
      setWarehouses(prev => prev.filter(w => w.id !== id));
    }
    return result;
  }, [companyId]);

  return { warehouses, isLoading, create, update, remove };
}

export function useStock(companyId: string) {
  const [stock, setStock] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getStock(companyId, ownedByUserId);
      if (result.success && result.data) {
        setStock(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { stock, isLoading };
}

export function useStockDetailed(companyId: string) {
  const [stock, setStock] = useState<StockItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getStockDetailed(companyId, ownedByUserId);
      if (result.success && result.data) {
        setStock(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { stock, isLoading };
}

export function useStockTransfers(companyId: string) {
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getStockTransfers(companyId, ownedByUserId);
      if (result.success && result.data) {
        setTransfers(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<StockTransfer, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.createStockTransfer(data, userId);
    if (result.success && result.id) {
      setTransfers(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  return { transfers, isLoading, create };
}

export function useInventoryTransactions(companyId: string) {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getInventoryTransactions(companyId, ownedByUserId);
      if (result.success && result.data) {
        setTransactions(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<InventoryTransaction, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.createInventoryTransaction(data, userId);
    if (result.success && result.id) {
      setTransactions(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  const remove = useCallback(async (id: string) => {
    const result = await inventoryApi.deleteInventoryTransaction(id, companyId);
    if (result.success) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
    return result;
  }, [companyId]);

  return { transactions, isLoading, create, remove };
}

export function useStockAdjustments(companyId: string) {
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getStockAdjustments(companyId, ownedByUserId);
      if (result.success && result.data) {
        setAdjustments(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<StockAdjustment, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.createStockAdjustment(data, userId);
    if (result.success && result.id) {
      setAdjustments(prev => [{ ...data, id: result.id! }, ...prev]);
    }
    return result;
  }, []);

  const approve = useCallback(async (id: string, approvedBy: string) => {
    const result = await inventoryApi.approveStockAdjustment(id, companyId, approvedBy);
    if (result.success) {
      setAdjustments(prev => prev.map(a => a.id === id ? { ...a, status: 'approved', approvedBy, approvedAt: new Date().toISOString() } : a));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await inventoryApi.deleteStockAdjustment(id, companyId);
    if (result.success) {
      setAdjustments(prev => prev.filter(a => a.id !== id));
    }
    return result;
  }, [companyId]);

  return { adjustments, isLoading, create, approve, remove };
}

export function useProductCategories(companyId: string) {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const auth = useAuthStore.getState();
      const ownedByUserId = auth.shouldFilterByOwner('inventory') ? auth.user?.id : undefined;
      const result = await inventoryApi.getCategories(companyId, ownedByUserId);
      if (result.success && result.data) {
        setCategories(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<ProductCategory, 'id'>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.createProductCategory(data, userId);
    if (result.success && result.id) {
      setCategories(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<ProductCategory>) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return { success: false, error: 'User not authenticated' };
    const result = await inventoryApi.updateProductCategory(id, companyId, userId, data);
    if (result.success) {
      setCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    }
    return result;
  }, [companyId]);

  const remove = useCallback(async (id: string) => {
    const result = await inventoryApi.deleteProductCategory(id, companyId);
    if (result.success) {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
    return result;
  }, [companyId]);

  return { categories, isLoading, create, update, remove };
}
