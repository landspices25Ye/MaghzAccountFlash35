import { getDbAdapter } from '@/core/database/adapters';
import type { Supplier, PurchaseInvoice, PurchaseOrder } from './types';

export const purchasesApi = {
  // ─── Suppliers ────────────────────────────────────────────────────────────
  async getSuppliers(companyId: string): Promise<{ success: boolean; data?: Supplier[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      'SELECT * FROM suppliers WHERE company_id = $1 AND is_active = true ORDER BY name',
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as Supplier[] };
    }
    return { success: false, error: result.error };
  },

  async createSupplier(data: Omit<Supplier, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO suppliers (company_id, name, phone, email, address, tax_number, balance, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [data.companyId, data.name, data.phone, data.email, data.address, data.taxNumber, data.balance, data.isActive]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  // ─── Purchase Invoices ────────────────────────────────────────────────────
  async getInvoices(companyId: string): Promise<{ success: boolean; data?: PurchaseInvoice[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT i.*, s.name as supplier_name 
       FROM purchase_invoices i
       LEFT JOIN suppliers s ON i.supplier_id = s.id
       WHERE i.company_id = $1
       ORDER BY i.date DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as PurchaseInvoice[] };
    }
    return { success: false, error: result.error };
  },

  async createInvoice(data: Omit<PurchaseInvoice, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    
    const txResult = await adapter.transaction([
      { sql: `INSERT INTO purchase_invoices (company_id, invoice_number, supplier_id, date, due_date, subtotal, discount_amount, vat_amount, total_amount, paid_amount, status, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        params: [data.companyId, data.invoiceNumber, data.supplierId, data.date, data.dueDate, data.subtotal, data.discountAmount, data.vatAmount, data.totalAmount, data.paidAmount, data.status, data.notes] },
    ]);
    
    if (txResult.success && txResult.results?.[0]?.[0]) {
      const invoiceId = txResult.results[0][0].id;
      
      for (const line of data.lines) {
        await adapter.query(
          `INSERT INTO purchase_invoice_lines (invoice_id, product_id, quantity, unit_price, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [invoiceId, line.productId, line.quantity, line.unitPrice, line.lineTotal]
        );
      }
      
      return { success: true, id: invoiceId };
    }
    return { success: false, error: txResult.error };
  },

  async createOrder(data: Omit<PurchaseOrder, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `INSERT INTO purchase_orders (company_id, order_number, supplier_id, date, expected_date, total_amount, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [data.companyId, data.orderNumber, data.supplierId, data.date, data.expectedDate, data.totalAmount, data.status, data.notes]
    );
    if (result.success && result.rows?.[0]) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  async getOrders(companyId: string): Promise<{ success: boolean; data?: PurchaseOrder[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT po.*, s.name as supplier_name 
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
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
