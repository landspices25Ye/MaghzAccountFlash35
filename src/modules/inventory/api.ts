import { getDbAdapter } from '@/core/database/adapters';
import type { Product, Warehouse, Stock, StockItem, StockTransfer, InventoryTransaction, StockAdjustment, ProductCategory } from './types';

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
      `UPDATE products SET name_ar = $1, name_en = $2, code = $3, barcode = $4, sku = $5, unit = $6, cost_price = $7, sale_price = $8, is_active = $9, image = $10, min_stock = $11, max_stock = $12, reorder_point = $13, category_ids = $14 WHERE id = $15`,
      [data.nameAr, data.nameEn, data.code, data.barcode, data.sku, data.unit, data.costPrice, data.salePrice, data.isActive, data.image, data.minStock, data.maxStock, data.reorderPoint, data.categoryIds ? JSON.stringify(data.categoryIds) : null, id]
    );
  },

  async deleteProduct(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query('DELETE FROM products WHERE id = $1', [id]);
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

  async updateWarehouse(id: string, data: Partial<Warehouse>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE warehouses SET name = $1, code = $2, branch_id = $3, is_active = $4 WHERE id = $5`,
      [data.name, data.code, data.branchId, data.isActive, id]
    );
  },

  async deleteWarehouse(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query('DELETE FROM warehouses WHERE id = $1', [id]);
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
    const params: (string | number)[] = [productId];
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

  // ─── Stock Detailed ───────────────────────────────────────────────────────
  async getStockDetailed(companyId: string): Promise<{ success: boolean; data?: StockItem[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT s.*, p.name_ar as product_name, p.code as product_code, p.unit, p.cost_price, w.name as warehouse_name
       FROM stock s
       JOIN products p ON p.id = s.product_id
       JOIN warehouses w ON w.id = s.warehouse_id
       WHERE s.company_id = $1`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as StockItem[] };
    }
    return { success: false, error: result.error };
  },

  // ─── Stock Transfer ─────────────────────────────────────────────────────────
  async createStockTransfer(data: Omit<StockTransfer, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO stock_transfers (company_id, product_id, from_warehouse_id, to_warehouse_id, quantity, date, reference, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data.companyId, data.productId, data.fromWarehouseId, data.toWarehouseId, data.quantity, data.date, data.reference, data.notes, data.status]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async getStockTransfers(companyId: string): Promise<{ success: boolean; data?: StockTransfer[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM stock_transfers WHERE company_id = $1 ORDER BY date DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as StockTransfer[] };
    }
    return { success: false, error: result.error };
  },

  // ─── Inventory Transactions ─────────────────────────────────────────────────
  async getInventoryTransactions(companyId: string): Promise<{ success: boolean; data?: InventoryTransaction[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM inventory_transactions WHERE company_id = $1 ORDER BY date DESC, created_at DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as InventoryTransaction[] };
    }
    return { success: false, error: result.error };
  },

  async createInventoryTransaction(data: Omit<InventoryTransaction, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO inventory_transactions (company_id, date, type, product_id, warehouse_id, quantity, reference, notes, unit_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data.companyId, data.date, data.type, data.productId, data.warehouseId, data.quantity, data.reference, data.notes, data.unitCost]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async deleteInventoryTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query('DELETE FROM inventory_transactions WHERE id = $1', [id]);
  },

  // ─── Stock Adjustments ──────────────────────────────────────────────────────
  async getStockAdjustments(companyId: string): Promise<{ success: boolean; data?: StockAdjustment[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM stock_adjustments WHERE company_id = $1 ORDER BY date DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as StockAdjustment[] };
    }
    return { success: false, error: result.error };
  },

  async createStockAdjustment(data: Omit<StockAdjustment, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO stock_adjustments (company_id, date, product_id, warehouse_id, system_qty, actual_qty, difference, reason, status, unit_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [data.companyId, data.date, data.productId, data.warehouseId, data.systemQty, data.actualQty, data.difference, data.reason, data.status, data.unitCost]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async updateStockAdjustment(id: string, data: Partial<StockAdjustment>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE stock_adjustments SET system_qty = $1, actual_qty = $2, difference = $3, reason = $4, status = $5, unit_cost = $6 WHERE id = $7`,
      [data.systemQty, data.actualQty, data.difference, data.reason, data.status, data.unitCost, id]
    );
  },

  async approveStockAdjustment(id: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE stock_adjustments SET status = 'approved', approved_by = $1, approved_at = $2 WHERE id = $3`,
      [approvedBy, new Date().toISOString(), id]
    );
  },

  async deleteStockAdjustment(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query('DELETE FROM stock_adjustments WHERE id = $1', [id]);
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

  async createProductCategory(data: Omit<ProductCategory, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'INSERT INTO product_categories (company_id, name, parent_id) VALUES ($1, $2, $3) RETURNING id',
      [data.companyId, data.name, data.parentId || null]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async updateProductCategory(id: string, data: Partial<ProductCategory>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'UPDATE product_categories SET name = $1, parent_id = $2 WHERE id = $3',
      [data.name, data.parentId || null, id]
    );
    return result.success ? { success: true } : { success: false, error: result.error };
  },

  async deleteProductCategory(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query('DELETE FROM product_categories WHERE id = $1', [id]);
    return result.success ? { success: true } : { success: false, error: result.error };
  },
};
