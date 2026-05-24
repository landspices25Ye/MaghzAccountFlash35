import { getDbAdapter } from '@/core/database/adapters';
import type { Product, Warehouse, Stock, ProductCategory } from './types';

export const inventoryApi = {
  // ─── Products ─────────────────────────────────────────────────────────────
  async getProducts(companyId: string): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getProducts(companyId);
    return { success: result.success, data: result.data as Product[], error: result.error };
  },

  async createProduct(data: Omit<Product, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.createProduct(data);
  },

  async updateProduct(id: string, data: Partial<Product>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE products SET name_ar = $1, name_en = $2, code = $3, barcode = $4, sku = $5, unit = $6, cost_price = $7, sale_price = $8, is_active = $9 WHERE id = $10`,
      [data.nameAr, data.nameEn, data.code, data.barcode, data.sku, data.unit, data.costPrice, data.salePrice, data.isActive, id]
    );
  },

  // ─── Warehouses ───────────────────────────────────────────────────────────
  async getWarehouses(companyId: string): Promise<{ success: boolean; data?: Warehouse[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM warehouses WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as Warehouse[] };
    }
    return { success: false, error: result.error };
  },

  async createWarehouse(data: Omit<Warehouse, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO warehouses (company_id, name, code, branch_id, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id`,
      [data.companyId, data.name, data.code, data.branchId]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  // ─── Stock ────────────────────────────────────────────────────────────────
  async getStock(companyId: string): Promise<{ success: boolean; data?: Stock[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM stock WHERE company_id = $1',
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as Stock[] };
    }
    return { success: false, error: result.error };
  },

  async getProductStock(productId: string, warehouseId?: string): Promise<{ success: boolean; data?: Stock[]; error?: string }> {
    const adapter = await getDbAdapter();
    let sql = 'SELECT * FROM stock WHERE product_id = $1';
    const params: any[] = [productId];
    if (warehouseId) {
      sql += ' AND warehouse_id = $2';
      params.push(warehouseId);
    }
    const result = await adapter.query(sql, params);
    if (result.success) {
      return { success: true, data: result.rows as Stock[] };
    }
    return { success: false, error: result.error };
  },

  // ─── Categories ───────────────────────────────────────────────────────────
  async getCategories(companyId: string): Promise<{ success: boolean; data?: ProductCategory[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM product_categories WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as ProductCategory[] };
    }
    return { success: false, error: result.error };
  },
};
