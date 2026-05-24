import { useState, useEffect, useCallback } from 'react';
import { inventoryApi } from '../api';
import type { Product, Warehouse, Stock } from '../types';

export function useProducts(companyId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await inventoryApi.getProducts(companyId);
      if (result.success && result.data) {
        setProducts(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Product, 'id'>) => {
    const result = await inventoryApi.createProduct(data);
    if (result.success && result.id) {
      setProducts(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  const update = useCallback(async (id: string, data: Partial<Product>) => {
    const result = await inventoryApi.updateProduct(id, data);
    if (result.success) {
      setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    }
    return result;
  }, []);

  return { products, isLoading, create, update };
}

export function useWarehouses(companyId: string) {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await inventoryApi.getWarehouses(companyId);
      if (result.success && result.data) {
        setWarehouses(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  const create = useCallback(async (data: Omit<Warehouse, 'id'>) => {
    const result = await inventoryApi.createWarehouse(data);
    if (result.success && result.id) {
      setWarehouses(prev => [...prev, { ...data, id: result.id! }]);
    }
    return result;
  }, []);

  return { warehouses, isLoading, create };
}

export function useStock(companyId: string) {
  const [stock, setStock] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!companyId) return;
    async function load() {
      setIsLoading(true);
      const result = await inventoryApi.getStock(companyId);
      if (result.success && result.data) {
        setStock(result.data);
      }
      setIsLoading(false);
    }
    load();
  }, [companyId]);

  return { stock, isLoading };
}
