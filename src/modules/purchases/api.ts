import { z } from 'zod';
import { getDbAdapter } from '@/core/database/adapters';
import { validateInput, idCompanySchema, companyIdSchema, uuidSchema, createSupplierSchema, createPurchaseInvoiceSchema, createPurchaseOrderSchema, createPurchaseReturnSchema } from '@/core/utils/validation';
import type {
  Supplier,
  PurchaseInvoice,
  PurchaseInvoiceLine,
  PurchaseOrder,
  PurchaseOrderLine,
  PurchaseReturn,
  PurchaseReturnLine,
  SupplierStatementItem,
  ApAgingBucket,
} from './types';

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function mapSupplier(row: Record<string, unknown>): Supplier {
  return {
    id: String(row.id),
    companyId: String(row.company_id || row.companyId),
    code: row.code ? String(row.code) : undefined,
    name: String(row.name),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    taxNumber: row.tax_number ? String(row.tax_number) : undefined,
    balance: toNum(row.balance),
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

function mapInvoice(row: Record<string, unknown>): PurchaseInvoice {
  return {
    id: String(row.id),
    companyId: String(row.company_id || row.companyId),
    invoiceNumber: String(row.invoice_number || row.invoiceNumber || ''),
    supplierId: String(row.supplier_id || row.supplierId),
    supplier: row.supplier_name
      ? { id: String(row.supplier_id || row.supplierId), companyId: String(row.company_id || row.companyId), name: String(row.supplier_name), balance: 0, isActive: true }
      : undefined,
    purchaseOrderId: row.purchase_order_id ? String(row.purchase_order_id) : undefined,
    date: row.date ? String(row.date).split('T')[0] : '',
    dueDate: row.due_date ? String(row.due_date).split('T')[0] : undefined,
    subtotal: toNum(row.subtotal),
    discountAmount: toNum(row.discount_amount || row.discountAmount),
    vatAmount: toNum(row.vat_amount || row.vatAmount),
    totalAmount: toNum(row.total_amount || row.totalAmount),
    paidAmount: toNum(row.paid_amount || row.paidAmount),
    status: (row.status as any) || 'draft',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    lines: [],
  };
}

function mapInvoiceLine(row: Record<string, unknown>): PurchaseInvoiceLine {
  return {
    id: row.id ? String(row.id) : undefined,
    invoiceId: row.invoice_id ? String(row.invoice_id) : undefined,
    productId: row.product_id ? String(row.product_id) : undefined,
    description: row.description ? String(row.description) : undefined,
    quantity: toNum(row.quantity),
    unitPrice: toNum(row.unit_price || row.unitPrice),
    discountPercent: toNum(row.discount_percent || row.discountPercent),
    vatPercent: toNum(row.vat_percent || row.vatPercent),
    lineTotal: toNum(row.line_total || row.lineTotal),
  };
}

function mapOrder(row: Record<string, unknown>): PurchaseOrder {
  return {
    id: String(row.id),
    companyId: String(row.company_id || row.companyId),
    orderNumber: String(row.order_number || row.orderNumber || ''),
    supplierId: String(row.supplier_id || row.supplierId),
    supplier: row.supplier_name
      ? { id: String(row.supplier_id || row.supplierId), companyId: String(row.company_id || row.companyId), name: String(row.supplier_name), balance: 0, isActive: true }
      : undefined,
    date: row.date ? String(row.date).split('T')[0] : '',
    expectedDate: row.expected_date ? String(row.expected_date).split('T')[0] : undefined,
    totalAmount: toNum(row.total_amount || row.totalAmount),
    status: (row.status as any) || 'draft',
    notes: row.notes ? String(row.notes) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    lines: [],
  };
}

function mapOrderLine(row: Record<string, unknown>): PurchaseOrderLine {
  return {
    id: row.id ? String(row.id) : undefined,
    orderId: row.order_id ? String(row.order_id) : undefined,
    productId: row.product_id ? String(row.product_id) : undefined,
    description: row.description ? String(row.description) : undefined,
    quantity: toNum(row.quantity),
    unitPrice: toNum(row.unit_price || row.unitPrice),
    lineTotal: toNum(row.line_total || row.lineTotal),
    receivedQuantity: row.received_quantity ? toNum(row.received_quantity) : undefined,
  };
}

function mapReturn(row: Record<string, unknown>): PurchaseReturn {
  return {
    id: String(row.id),
    companyId: String(row.company_id || row.companyId),
    returnNumber: String(row.return_number || row.returnNumber || ''),
    invoiceId: row.invoice_id ? String(row.invoice_id) : undefined,
    invoiceNumber: row.invoice_number ? String(row.invoice_number) : undefined,
    supplierId: String(row.supplier_id || row.supplierId),
    supplier: row.supplier_name
      ? { id: String(row.supplier_id || row.supplierId), companyId: String(row.company_id || row.companyId), name: String(row.supplier_name), balance: 0, isActive: true }
      : undefined,
    date: row.date ? String(row.date).split('T')[0] : '',
    subtotal: toNum(row.subtotal),
    vatAmount: toNum(row.vat_amount || row.vatAmount),
    totalAmount: toNum(row.total_amount || row.totalAmount),
    status: (row.status as any) || 'draft',
    notes: row.notes ? String(row.notes) : undefined,
    reason: row.reason ? String(row.reason) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
    lines: [],
  };
}

function mapReturnLine(row: Record<string, unknown>): PurchaseReturnLine {
  return {
    id: row.id ? String(row.id) : undefined,
    returnId: row.return_id ? String(row.return_id) : undefined,
    productId: row.product_id ? String(row.product_id) : undefined,
    description: row.description ? String(row.description) : undefined,
    quantity: toNum(row.quantity),
    unitPrice: toNum(row.unit_price || row.unitPrice),
    lineTotal: toNum(row.line_total || row.lineTotal),
  };
}

export const purchasesApi = {
  // ─── Suppliers ────────────────────────────────────────────────────────────
  async getSuppliers(companyId: string): Promise<{ success: boolean; data?: Supplier[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'SELECT * FROM suppliers WHERE company_id = $1 AND is_active = true ORDER BY name',
        [companyId]
      );
      if (result.success) {
        return { success: true, data: (result.rows || []).map(mapSupplier) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getSupplierById(id: string, companyId: string): Promise<{ success: boolean; data?: Supplier; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'SELECT * FROM suppliers WHERE id = $1 AND company_id = $2 LIMIT 1',
        [id, companyId]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, data: mapSupplier(result.rows[0]) };
      }
      return { success: false, error: result.error || 'Supplier not found' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createSupplier(data: Omit<Supplier, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createSupplierSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO suppliers (company_id, code, name, phone, email, address, tax_number, balance, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [data.companyId, data.code, data.name, data.phone, data.email, data.address, data.taxNumber, data.balance, data.isActive]
      );
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id as string };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateSupplier(id: string, companyId: string, data: Partial<Supplier>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
      if (data.code !== undefined) { fields.push(`code = $${idx++}`); values.push(data.code); }
      if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
      if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
      if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address); }
      if (data.taxNumber !== undefined) { fields.push(`tax_number = $${idx++}`); values.push(data.taxNumber); }
      if (data.balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(data.balance); }
      if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }

      if (fields.length === 0) return { success: true };
      values.push(id);
      values.push(companyId);

      const result = await adapter.query(
        `UPDATE suppliers SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`,
        values
      );
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteSupplier(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'UPDATE suppliers SET is_active = false WHERE id = $1 AND company_id = $2',
        [id, companyId]
      );
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getSupplierStatement(supplierId: string, companyId: string): Promise<{ success: boolean; data?: SupplierStatementItem[]; error?: string }> {
    try {
      const idValidation = validateInput(z.object({ supplierId: uuidSchema, companyId: companyIdSchema }), { supplierId, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const invoices = await adapter.query(
        `SELECT id, date, invoice_number as doc_number, total_amount, paid_amount, status
        FROM purchase_invoices WHERE supplier_id = $1 AND company_id = $2 AND status != 'cancelled'
        ORDER BY date`,
        [supplierId, companyId]
      );
      const payments = await adapter.query(
        `SELECT id, date, reference as doc_number, amount
        FROM payment_vouchers WHERE beneficiary_id = $1 AND company_id = $2
        ORDER BY date`,
        [supplierId, companyId]
      );

      if (!invoices.success || !payments.success) {
        return { success: false, error: invoices.error || payments.error };
      }

      const items: SupplierStatementItem[] = [];
      let balance = 0;

      for (const inv of invoices.rows || []) {
        const amount = Number(inv.total_amount);
        const paid = Number(inv.paid_amount || 0);
        balance += amount;
        items.push({
          id: inv.id,
          date: inv.date,
          type: 'invoice',
          documentNumber: inv.doc_number,
          description: 'فاتورة مشتريات',
          debit: amount,
          credit: 0,
          balance,
        });
        if (paid > 0) {
          balance -= paid;
          items.push({
            id: `p-${inv.id}`,
            date: inv.date,
            type: 'payment',
            documentNumber: inv.doc_number,
            description: 'دفعة',
            debit: 0,
            credit: paid,
            balance,
          });
        }
      }

      for (const pay of payments.rows || []) {
        const amount = Number(pay.amount);
        balance -= amount;
        items.push({
          id: pay.id,
          date: pay.date,
          type: 'payment',
          documentNumber: pay.doc_number,
          description: 'سند صرف',
          debit: 0,
          credit: amount,
          balance,
        });
      }

      return { success: true, data: items };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getApAging(supplierId: string, companyId: string): Promise<{ success: boolean; data?: ApAgingBucket[]; error?: string }> {
    try {
      const idValidation = validateInput(z.object({ supplierId: uuidSchema, companyId: companyIdSchema }), { supplierId, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT due_date, total_amount, paid_amount FROM purchase_invoices
        WHERE supplier_id = $1 AND company_id = $2 AND status IN ('posted', 'partially_paid')`,
        [supplierId, companyId]
      );
      if (!result.success) return { success: false, error: result.error };

      const buckets: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
      const now = new Date();

      for (const row of result.rows || []) {
        const due = new Date(row.due_date || row.date);
        const remaining = Number(row.total_amount) - Number(row.paid_amount || 0);
        if (remaining <= 0) continue;
        const diffDays = Math.floor((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays <= 30) buckets['0-30'] += remaining;
        else if (diffDays <= 60) buckets['31-60'] += remaining;
        else if (diffDays <= 90) buckets['61-90'] += remaining;
        else buckets['91+'] += remaining;
      }

      const data: ApAgingBucket[] = Object.entries(buckets).map(([bucket, amount]) => ({
        bucket,
        amount,
        count: amount > 0 ? 1 : 0,
      }));

      return { success: true, data };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Purchase Invoices ────────────────────────────────────────────────────
  async getInvoices(companyId: string): Promise<{ success: boolean; data?: PurchaseInvoice[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT i.*, s.name as supplier_name, s.id as supplier_id
        FROM purchase_invoices i
        LEFT JOIN suppliers s ON i.supplier_id = s.id
        WHERE i.company_id = $1
        ORDER BY i.date DESC`,
        [companyId]
      );
      if (result.success) {
        return { success: true, data: (result.rows || []).map(mapInvoice) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getInvoiceById(id: string, companyId: string): Promise<{ success: boolean; data?: PurchaseInvoice; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const inv = await adapter.query(
        `SELECT i.*, s.name as supplier_name FROM purchase_invoices i
        LEFT JOIN suppliers s ON i.supplier_id = s.id WHERE i.id = $1 AND i.company_id = $2 LIMIT 1`,
        [id, companyId]
      );
      if (!inv.success || !inv.rows?.[0]) return { success: false, error: inv.error || 'Not found' };

      const lines = await adapter.query(
        `SELECT * FROM purchase_invoice_lines WHERE invoice_id = $1`,
        [id]
      );

      const invoice = mapInvoice(inv.rows[0]);
      invoice.lines = (lines.rows || []).map(mapInvoiceLine);
      return { success: true, data: invoice };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createInvoice(data: Omit<PurchaseInvoice, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createPurchaseInvoiceSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const queries: { sql: string; params?: unknown[] }[] = [
        {
          sql: `INSERT INTO purchase_invoices (company_id, invoice_number, supplier_id, purchase_order_id, date, due_date, subtotal, discount_amount, vat_amount, total_amount, paid_amount, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id`,
          params: [data.companyId, data.invoiceNumber, data.supplierId, data.purchaseOrderId || null, data.date, data.dueDate, data.subtotal, data.discountAmount, data.vatAmount, data.totalAmount, data.paidAmount, data.status, data.notes],
        },
      ];
      for (let i = 0; i < data.lines.length; i++) {
        const line = data.lines[i];
        queries.push({
          sql: `INSERT INTO purchase_invoice_lines (invoice_id, product_id, quantity, unit_price, line_total)
          VALUES ($1, $2, $3, $4, $5)`,
          params: [null, line.productId, line.quantity, line.unitPrice, line.lineTotal],
        });
      }

      const txResult = await adapter.transaction(queries);

      if (txResult.success && txResult.results?.[0]?.[0]) {
        const invoiceId = txResult.results[0][0].id as string;
        return { success: true, id: invoiceId };
      }
      return { success: false, error: txResult.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateInvoice(id: string, companyId: string, data: Partial<PurchaseInvoice>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (data.supplierId !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(data.supplierId); }
      if (data.purchaseOrderId !== undefined) { fields.push(`purchase_order_id = $${idx++}`); values.push(data.purchaseOrderId); }
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.dueDate); }
      if (data.subtotal !== undefined) { fields.push(`subtotal = $${idx++}`); values.push(data.subtotal); }
      if (data.discountAmount !== undefined) { fields.push(`discount_amount = $${idx++}`); values.push(data.discountAmount); }
      if (data.vatAmount !== undefined) { fields.push(`vat_amount = $${idx++}`); values.push(data.vatAmount); }
      if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
      if (data.paidAmount !== undefined) { fields.push(`paid_amount = $${idx++}`); values.push(data.paidAmount); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

      if (fields.length === 0) return { success: true };
      values.push(id);
      values.push(companyId);

      const result = await adapter.query(`UPDATE purchase_invoices SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteInvoice(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.transaction([
        { sql: 'DELETE FROM purchase_invoice_lines WHERE invoice_id = $1', params: [id] },
        { sql: 'DELETE FROM purchase_invoices WHERE id = $1 AND company_id = $2', params: [id, companyId] },
      ]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async postInvoice(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `UPDATE purchase_invoices SET status = 'posted' WHERE id = $1 AND company_id = $2 AND status = 'draft'`,
        [id, companyId]
      );
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Purchase Orders ──────────────────────────────────────────────────────
  async getOrders(companyId: string): Promise<{ success: boolean; data?: PurchaseOrder[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT po.*, s.name as supplier_name, s.id as supplier_id
        FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id
        WHERE po.company_id = $1
        ORDER BY po.date DESC`,
        [companyId]
      );
      if (result.success) {
        return { success: true, data: (result.rows || []).map(mapOrder) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getOrderById(id: string, companyId: string): Promise<{ success: boolean; data?: PurchaseOrder; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const order = await adapter.query(
        `SELECT po.*, s.name as supplier_name FROM purchase_orders po
        LEFT JOIN suppliers s ON po.supplier_id = s.id WHERE po.id = $1 AND po.company_id = $2 LIMIT 1`,
        [id, companyId]
      );
      if (!order.success || !order.rows?.[0]) return { success: false, error: order.error || 'Not found' };

      const lines = await adapter.query(
        `SELECT * FROM purchase_order_lines WHERE order_id = $1`,
        [id]
      );

      const mapped = mapOrder(order.rows[0]);
      mapped.lines = (lines.rows || []).map(mapOrderLine);
      return { success: true, data: mapped };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createOrder(data: Omit<PurchaseOrder, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createPurchaseOrderSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const queries: { sql: string; params?: unknown[] }[] = [
        {
          sql: `INSERT INTO purchase_orders (company_id, order_number, supplier_id, date, expected_date, total_amount, status, notes)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
          params: [data.companyId, data.orderNumber, data.supplierId, data.date, data.expectedDate, data.totalAmount, data.status, data.notes],
        },
      ];
      if (data.lines) {
        for (const line of data.lines) {
          queries.push({
            sql: `INSERT INTO purchase_order_lines (order_id, product_id, quantity, unit_price, line_total)
            VALUES ($1, $2, $3, $4, $5)`,
            params: [null, line.productId, line.quantity, line.unitPrice, line.lineTotal],
          });
        }
      }

      const txResult = await adapter.transaction(queries);

      if (txResult.success && txResult.results?.[0]?.[0]) {
        const orderId = txResult.results[0][0].id as string;
        return { success: true, id: orderId };
      }
      return { success: false, error: txResult.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateOrder(id: string, companyId: string, data: Partial<PurchaseOrder>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (data.supplierId !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(data.supplierId); }
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.expectedDate !== undefined) { fields.push(`expected_date = $${idx++}`); values.push(data.expectedDate); }
      if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }

      if (fields.length === 0) return { success: true };
      values.push(id);
      values.push(companyId);

      const result = await adapter.query(`UPDATE purchase_orders SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteOrder(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.transaction([
        { sql: 'DELETE FROM purchase_order_lines WHERE order_id = $1', params: [id] },
        { sql: 'DELETE FROM purchase_orders WHERE id = $1 AND company_id = $2', params: [id, companyId] },
      ]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async convertOrderToInvoice(orderId: string, companyId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const idValidation = validateInput(z.object({ orderId: uuidSchema, companyId: companyIdSchema }), { orderId, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const order = await purchasesApi.getOrderById(orderId, companyId);
      if (!order.success || !order.data) return { success: false, error: 'Order not found' };

      const invNumberResult = await adapter.query(
        `SELECT COUNT(*) as cnt FROM purchase_invoices WHERE company_id = $1`,
        [companyId]
      );
      const count = Number(invNumberResult.rows?.[0]?.cnt || 0) + 1;
      const invoiceNumber = `PINV-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;

      const invData: Omit<PurchaseInvoice, 'id'> = {
        companyId,
        invoiceNumber,
        supplierId: order.data.supplierId,
        purchaseOrderId: orderId,
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date().toISOString().split('T')[0],
        subtotal: order.data.totalAmount,
        discountAmount: 0,
        vatAmount: 0,
        totalAmount: order.data.totalAmount,
        paidAmount: 0,
        status: 'draft',
        notes: `تم التحويل من أمر الشراء ${order.data.orderNumber}`,
        lines: (order.data.lines || []).map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          lineTotal: l.lineTotal,
        })),
      };

      const createResult = await purchasesApi.createInvoice(invData);
      if (createResult.success) {
        await adapter.query(`UPDATE purchase_orders SET status = 'invoiced' WHERE id = $1 AND company_id = $2`, [orderId, companyId]);
      }
      return createResult;
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Purchase Returns ─────────────────────────────────────────────────────
  async getReturns(companyId: string): Promise<{ success: boolean; data?: PurchaseReturn[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT r.*, s.name as supplier_name, s.id as supplier_id
        FROM purchase_returns r
        LEFT JOIN suppliers s ON r.supplier_id = s.id
        WHERE r.company_id = $1
        ORDER BY r.date DESC`,
        [companyId]
      );
      if (result.success) {
        return { success: true, data: (result.rows || []).map(mapReturn) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getReturnById(id: string, companyId: string): Promise<{ success: boolean; data?: PurchaseReturn; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const ret = await adapter.query(
        `SELECT r.*, s.name as supplier_name FROM purchase_returns r
        LEFT JOIN suppliers s ON r.supplier_id = s.id WHERE r.id = $1 AND r.company_id = $2 LIMIT 1`,
        [id, companyId]
      );
      if (!ret.success || !ret.rows?.[0]) return { success: false, error: ret.error || 'Not found' };

      const lines = await adapter.query(
        `SELECT * FROM purchase_return_lines WHERE return_id = $1`,
        [id]
      );

      const mapped = mapReturn(ret.rows[0]);
      mapped.lines = (lines.rows || []).map(mapReturnLine);
      return { success: true, data: mapped };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createReturn(data: Omit<PurchaseReturn, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createPurchaseReturnSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const queries: { sql: string; params?: unknown[] }[] = [
        {
          sql: `INSERT INTO purchase_returns (company_id, return_number, invoice_id, supplier_id, date, subtotal, vat_amount, total_amount, status, notes, reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
          params: [data.companyId, data.returnNumber, data.invoiceId || null, data.supplierId, data.date, data.subtotal, data.vatAmount, data.totalAmount, data.status, data.notes, data.reason],
        },
      ];
      for (const line of data.lines) {
        queries.push({
          sql: `INSERT INTO purchase_return_lines (return_id, product_id, quantity, unit_price, line_total)
          VALUES ($1, $2, $3, $4, $5)`,
          params: [null, line.productId, line.quantity, line.unitPrice, line.lineTotal],
        });
      }

      const txResult = await adapter.transaction(queries);

      if (txResult.success && txResult.results?.[0]?.[0]) {
        const returnId = txResult.results[0][0].id as string;
        return { success: true, id: returnId };
      }
      return { success: false, error: txResult.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateReturn(id: string, companyId: string, data: Partial<PurchaseReturn>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;

      if (data.supplierId !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(data.supplierId); }
      if (data.invoiceId !== undefined) { fields.push(`invoice_id = $${idx++}`); values.push(data.invoiceId); }
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.subtotal !== undefined) { fields.push(`subtotal = $${idx++}`); values.push(data.subtotal); }
      if (data.vatAmount !== undefined) { fields.push(`vat_amount = $${idx++}`); values.push(data.vatAmount); }
      if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
      if (data.reason !== undefined) { fields.push(`reason = $${idx++}`); values.push(data.reason); }

      if (fields.length === 0) return { success: true };
      values.push(id);
      values.push(companyId);

      const result = await adapter.query(`UPDATE purchase_returns SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteReturn(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.transaction([
        { sql: 'DELETE FROM purchase_return_lines WHERE return_id = $1', params: [id] },
        { sql: 'DELETE FROM purchase_returns WHERE id = $1 AND company_id = $2', params: [id, companyId] },
      ]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async postReturn(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `UPDATE purchase_returns SET status = 'posted' WHERE id = $1 AND company_id = $2 AND status = 'draft'`,
        [id, companyId]
      );
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
};
