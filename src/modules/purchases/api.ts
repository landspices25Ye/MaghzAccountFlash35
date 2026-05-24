import { getDbAdapter } from '@/core/database/adapters';
import type { Supplier, PurchaseInvoice, PurchaseOrder } from './types';

export const purchasesApi = {
  // ─── Suppliers ────────────────────────────────────────────────────────────
  async getSuppliers(companyId: string): Promise<{ success: boolean; data?: Supplier[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getContacts(companyId, 'vendor');
    if (result.success) {
      return { success: true, data: result.data as Supplier[] };
    }
    return { success: false, error: result.error };
  },

  async createSupplier(data: Omit<Supplier, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.createContact({ ...data, type: 'vendor' });
  },

  // ─── Purchase Invoices ────────────────────────────────────────────────────
  async getInvoices(companyId: string): Promise<{ success: boolean; data?: PurchaseInvoice[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT i.*, s.name as supplier_name 
       FROM purchase_invoices i
       LEFT JOIN contacts s ON i.supplier_id = s.id
       WHERE i.company_id = $1
       ORDER BY i.date DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as PurchaseInvoice[] };
    }
    return { success: false, error: result.error };
  },

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  async getOrders(companyId: string): Promise<{ success: boolean; data?: PurchaseOrder[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT po.*, s.name as supplier_name 
       FROM purchase_orders po
       LEFT JOIN contacts s ON po.supplier_id = s.id
       WHERE po.company_id = $1
       ORDER BY po.date DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as PurchaseOrder[] };
    }
    return { success: false, error: result.error };
  },
};
