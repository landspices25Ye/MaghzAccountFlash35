import { getDbAdapter } from '@/core/database/adapters';
import { mapRows } from '@/core/utils/mapPgRow';
import { z } from 'zod';
import { validateInput, idCompanySchema, companyIdSchema, uuidSchema, createProductSchema } from '@/core/utils/validation';
import { clampPageArgs, paginatedResult, type PaginatedQueryResult } from '@/core/utils/pagination';
import type { Product, Warehouse, Stock, StockItem, StockTransfer, InventoryTransaction, StockAdjustment, ProductCategory } from './types';

export const inventoryApi = {
  // ─── Products ─────────────────────────────────────────────────────────────
  async getProducts(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: Product[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.getProducts(companyId);
      let rows = mapRows<Product>(result.data);
      if (ownedByUserId) {
        rows = rows.filter((r) => (r as unknown as { createdBy?: string }).createdBy === ownedByUserId);
      }
      return { success: result.success, data: rows, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getProductsPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { search?: string; isActive?: boolean; productTypeId?: string }
  ): Promise<PaginatedQueryResult<Product>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['p.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.isActive !== undefined) {
        params.push(filters.isActive);
        conditions.push(`p.is_active = $${params.length}`);
      }
      if (filters?.productTypeId) {
        params.push(filters.productTypeId);
        conditions.push(`p.product_type_id = $${params.length}`);
      }
      if (filters?.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`(p.name_ar ILIKE $${params.length} OR p.name_en ILIKE $${params.length} OR p.code ILIKE $${params.length})`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM products p WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT p.*, COALESCE(
            (SELECT json_agg(ppc.category_id)
             FROM product_product_categories ppc
             WHERE ppc.product_id = p.id), '[]'::json
         ) AS category_ids
         FROM products p
         WHERE ${where}
         ORDER BY p.name_ar
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = mapRows<Product>(dataResult.rows || []);
      return { success: true, data: paginatedResult(items, total, p, ps) };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createProduct(data: Omit<Product, 'id'>, _createdBy?: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createProductSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const payload = { ...data, createdBy: _createdBy ?? data.createdBy, updatedBy: _createdBy ?? data.updatedBy };
      return adapter.createProduct(payload);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateProduct(id: string, companyId: string, _updatedBy?: string, data: Partial<Product> = {}): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      if (data.categoryIds !== undefined) {
        await adapter.query('DELETE FROM product_product_categories WHERE product_id = $1', [id]);
        if (data.categoryIds.length > 0) {
          for (const categoryId of data.categoryIds) {
            await adapter.query(
              'INSERT INTO product_product_categories (product_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [id, categoryId]
            );
          }
        }
      }
      return adapter.query(
        `UPDATE products SET name_ar = $1, name_en = $2, code = $3, barcode = $4, sku = $5, unit = $6, cost_price = $7, sale_price = $8, is_active = $9, image = $10, min_stock = $11, max_stock = $12, reorder_point = $13, category_id = $14, product_type_id = $15, updated_by = $16 WHERE id = $17 AND company_id = $18`,
        [data.nameAr, data.nameEn, data.code, data.barcode, data.sku, data.unit, data.costPrice, data.salePrice, data.isActive, data.image, data.minStock, data.maxStock, data.reorderPoint, data.categoryId ?? null, data.productTypeId ?? null, data.updatedBy ?? null, id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteProduct(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query('DELETE FROM products WHERE id = $1 AND company_id = $2', [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Warehouses ───────────────────────────────────────────────────────────
  async getWarehouses(companyId: string): Promise<{ success: boolean; data?: Warehouse[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'SELECT * FROM warehouses WHERE company_id = $1 AND is_active = true ORDER BY name',
        [companyId]
      );
      if (result.success) {
        return { success: true, data: mapRows<Warehouse>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createWarehouse(data: Omit<Warehouse, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO warehouses (company_id, name, code, branch_id, is_active) VALUES ($1, $2, $3, $4, true) RETURNING id`,
        [data.companyId, data.name, data.code, data.branchId]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateWarehouse(id: string, companyId: string, data: Partial<Warehouse>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query(
        `UPDATE warehouses SET name = $1, code = $2, branch_id = $3, is_active = $4 WHERE id = $5 AND company_id = $6`,
        [data.name, data.code, data.branchId, data.isActive, id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteWarehouse(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query('DELETE FROM warehouses WHERE id = $1 AND company_id = $2', [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Stock ────────────────────────────────────────────────────────────────
  async getStock(companyId: string): Promise<{ success: boolean; data?: Stock[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'SELECT * FROM stock WHERE company_id = $1',
        [companyId]
      );
      if (result.success) {
        return { success: true, data: mapRows<Stock>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getProductStock(productId: string, companyId: string, warehouseId?: string): Promise<{ success: boolean; data?: Stock[]; error?: string }> {
    try {
      const idValidation = validateInput(z.object({ productId: uuidSchema, companyId: companyIdSchema }), { productId, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      let sql = 'SELECT * FROM stock WHERE product_id = $1 AND company_id = $2';
      const params: (string | number)[] = [productId, companyId];
      if (warehouseId) {
        sql += ' AND warehouse_id = $3';
        params.push(warehouseId);
      }
      const result = await adapter.query(sql, params);
      if (result.success) {
        return { success: true, data: mapRows<Stock>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Stock Detailed ───────────────────────────────────────────────────────
  async getStockDetailed(companyId: string): Promise<{ success: boolean; data?: StockItem[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
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
        return { success: true, data: mapRows<StockItem>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Stock Transfer ─────────────────────────────────────────────────────────
  async createStockTransfer(data: Omit<StockTransfer, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO stock_transfers (company_id, product_id, from_warehouse_id, to_warehouse_id, quantity, date, reference, notes, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [data.companyId, data.productId, data.fromWarehouseId, data.toWarehouseId, data.quantity, data.date, data.reference, data.notes, data.status]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getStockTransfers(companyId: string): Promise<{ success: boolean; data?: StockTransfer[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT * FROM warehouse_transfers WHERE company_id = $1 ORDER BY created_at DESC`,
        [companyId]
      );
      if (result.success) {
        return { success: true, data: mapRows<StockTransfer>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Inventory Transactions (backed by stock_movements) ────────────────────
  async getInventoryTransactions(companyId: string): Promise<{ success: boolean; data?: InventoryTransaction[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT id, company_id, product_id, warehouse_id, type, quantity, reference, notes, created_at
           FROM stock_movements
          WHERE company_id = $1
          ORDER BY created_at DESC`,
        [companyId]
      );
      if (result.success) {
        return { success: true, data: mapRows<InventoryTransaction>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createInventoryTransaction(data: Omit<InventoryTransaction, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO stock_movements (company_id, type, product_id, warehouse_id, quantity, reference, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [data.companyId, data.type, data.productId, data.warehouseId, data.quantity, data.reference, data.notes]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteInventoryTransaction(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query('DELETE FROM stock_movements WHERE id = $1 AND company_id = $2', [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Stock Adjustments ──────────────────────────────────────────────────────
  async getStockAdjustments(companyId: string): Promise<{ success: boolean; data?: StockAdjustment[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT * FROM stock_adjustments WHERE company_id = $1 ORDER BY date DESC`,
        [companyId]
      );
      if (result.success) {
        return { success: true, data: mapRows<StockAdjustment>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createStockAdjustment(data: Omit<StockAdjustment, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO stock_adjustments (company_id, date, product_id, warehouse_id, system_qty, actual_qty, difference, reason, status, unit_cost) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [data.companyId, data.date, data.productId, data.warehouseId, data.systemQty, data.actualQty, data.difference, data.reason, data.status, data.unitCost]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateStockAdjustment(id: string, companyId: string, data: Partial<StockAdjustment>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query(
        `UPDATE stock_adjustments SET system_qty = $1, actual_qty = $2, difference = $3, reason = $4, status = $5, unit_cost = $6 WHERE id = $7 AND company_id = $8`,
        [data.systemQty, data.actualQty, data.difference, data.reason, data.status, data.unitCost, id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async approveStockAdjustment(id: string, companyId: string, approvedBy: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query(
        `UPDATE stock_adjustments SET status = 'approved', approved_by = $1, approved_at = $2 WHERE id = $3 AND company_id = $4`,
        [approvedBy, new Date().toISOString(), id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteStockAdjustment(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return adapter.query('DELETE FROM stock_adjustments WHERE id = $1 AND company_id = $2', [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Categories ───────────────────────────────────────────────────────────
  async getCategories(companyId: string): Promise<{ success: boolean; data?: ProductCategory[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'SELECT * FROM product_categories WHERE company_id = $1 ORDER BY name',
        [companyId]
      );
      if (result.success) {
        return { success: true, data: mapRows<ProductCategory>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createProductCategory(data: Omit<ProductCategory, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'INSERT INTO product_categories (company_id, name, parent_id) VALUES ($1, $2, $3) RETURNING id',
        [data.companyId, data.name, data.parentId || null]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateProductCategory(id: string, companyId: string, data: Partial<ProductCategory>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'UPDATE product_categories SET name = $1, parent_id = $2 WHERE id = $3 AND company_id = $4',
        [data.name, data.parentId || null, id, companyId]
      );
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteProductCategory(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM product_categories WHERE id = $1 AND company_id = $2', [id, companyId]);
      return result.success ? { success: true } : { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
};
