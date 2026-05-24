import { getDbAdapter } from '@/core/database/adapters';
import type { Customer, SalesInvoice } from './types';

export const salesApi = {
  // ─── Customers ────────────────────────────────────────────────────────────
  async getCustomers(companyId: string): Promise<{ success: boolean; data?: Customer[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getContacts(companyId, 'customer');
    if (result.success) {
      return { success: true, data: result.data as Customer[] };
    }
    return { success: false, error: result.error };
  },

  async createCustomer(data: Omit<Customer, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.createContact({ ...data, type: 'customer' });
  },

  // ─── Sales Invoices ───────────────────────────────────────────────────────
  async getInvoices(companyId: string): Promise<{ success: boolean; data?: SalesInvoice[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT i.*, c.name as customer_name 
       FROM sales_invoices i
       LEFT JOIN contacts c ON i.customer_id = c.id
       WHERE i.company_id = $1
       ORDER BY i.date DESC`,
      [companyId]
    );
    if (result.success) {
      return { success: true, data: result.rows as SalesInvoice[] };
    }
    return { success: false, error: result.error };
  },

  async createInvoice(data: Omit<SalesInvoice, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    
    const txResult = await adapter.transaction([
      { sql: `INSERT INTO sales_invoices (company_id, invoice_number, customer_id, date, due_date, subtotal, discount_amount, vat_amount, total_amount, paid_amount, status, notes)
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        params: [data.companyId, data.invoiceNumber, data.customerId, data.date, data.dueDate, data.subtotal, data.discountAmount, data.vatAmount, data.totalAmount, data.paidAmount, data.status, data.notes] },
    ]);
    
    if (txResult.success && txResult.results?.[0]?.[0]) {
      const invoiceId = txResult.results[0][0].id;
      
      // Insert lines
      for (const line of data.lines) {
        await adapter.query(
          `INSERT INTO sales_invoice_lines (invoice_id, product_id, quantity, unit_price, discount_percent, vat_percent, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [invoiceId, line.productId, line.quantity, line.unitPrice, line.discountPercent, line.vatPercent, line.lineTotal]
        );
      }
      
      return { success: true, id: invoiceId };
    }
    return { success: false, error: txResult.error };
  },
};
