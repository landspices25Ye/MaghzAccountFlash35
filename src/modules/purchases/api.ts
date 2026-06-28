import { z } from 'zod';
import { getDbAdapter } from '@/core/database/adapters';
import { validateInput, idCompanySchema, companyIdSchema, uuidSchema, createSupplierSchema, createPurchaseInvoiceSchema, createPurchaseOrderSchema, createPurchaseReturnSchema } from '@/core/utils/validation';
import { clampPageArgs, paginatedResult, type PaginatedQueryResult } from '@/core/utils/pagination';
import { YER_CODE } from '@/core/utils/currencyConverter';
import { getNextDocumentNumber } from '@/core/api';
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
    currencyCode: row.currency_code ? String(row.currency_code) : YER_CODE,
    exchangeRate: row.exchange_rate !== undefined ? toNum(row.exchange_rate) : 1,
    baseCurrencyAmount: row.base_currency_amount !== undefined ? toNum(row.base_currency_amount) : 0,
    baseCurrencyPaid: row.base_currency_paid !== undefined ? toNum(row.base_currency_paid) : 0,
    status: (row.status as PurchaseInvoice["status"]) || 'draft',
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
    discountPercent: toNum(row.discount_percent ?? row.discountPercent),
    vatPercent: toNum(row.vat_percent ?? row.vatPercent),
    lineTotal: toNum(row.line_total || row.lineTotal),
    currencyCode: row.currency_code ? String(row.currency_code) : YER_CODE,
    exchangeRate: row.exchange_rate !== undefined ? toNum(row.exchange_rate) : 1,
    baseCurrencyLineTotal: row.base_currency_line_total !== undefined ? toNum(row.base_currency_line_total) : 0,
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
    status: (row.status as PurchaseOrder["status"]) || 'draft',
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
    status: (row.status as PurchaseReturn["status"]) || 'draft',
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

  async getSuppliersPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { isActive?: boolean; search?: string }
  ): Promise<PaginatedQueryResult<Supplier>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.isActive !== undefined) {
        params.push(filters.isActive);
        conditions.push(`is_active = $${params.length}`);
      }
      if (filters?.search) {
        params.push(`%${filters.search}%`);
        conditions.push(`name ILIKE $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM suppliers WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT * FROM suppliers WHERE ${where} ORDER BY name LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = (dataResult.rows || []).map((row: Record<string, unknown>) => mapSupplier(row));
      return { success: true, data: paginatedResult(items, total, p, ps) };
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
        `SELECT id, date, voucher_number as doc_number, amount
        FROM payment_vouchers WHERE supplier_id = $1 AND company_id = $2
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
        const dueRaw = row.due_date || row.date;
        if (!dueRaw) continue; // skip rows without a date to avoid NaN buckets
        const due = new Date(dueRaw);
        if (isNaN(due.getTime())) continue; // skip invalid dates
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

  async getApAgingTotal(companyId: string): Promise<{ success: boolean; total?: number; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding
           FROM purchase_invoices
          WHERE company_id = $1 AND status IN ('posted', 'partially_paid')`,
        [companyId]
      );
      if (!result.success) return { success: false, error: result.error };
      return { success: true, total: Number(result.rows?.[0]?.outstanding || 0) };
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

  async getInvoicesPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { status?: string; supplierId?: string }
  ): Promise<PaginatedQueryResult<PurchaseInvoice>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['i.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`i.status = $${params.length}`);
      }
      if (filters?.supplierId) {
        params.push(filters.supplierId);
        conditions.push(`i.supplier_id = $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM purchase_invoices i WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT i.*, s.name as supplier_name, s.id as supplier_id
         FROM purchase_invoices i
         LEFT JOIN suppliers s ON i.supplier_id = s.id
         WHERE ${where}
         ORDER BY i.date DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = (dataResult.rows || []).map((row: Record<string, unknown>) => mapInvoice(row));
      return { success: true, data: paginatedResult(items, total, p, ps) };
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
      const currencyCode = data.currencyCode || YER_CODE;
      const exchangeRate = data.exchangeRate ?? 1;
      const baseCurrencyAmount = data.baseCurrencyAmount ?? (data.totalAmount * exchangeRate);
      const baseCurrencyPaid = data.baseCurrencyPaid ?? 0;
      const params: unknown[] = [data.companyId, data.invoiceNumber, data.supplierId, data.purchaseOrderId || null, data.date, data.dueDate, data.subtotal, data.discountAmount, data.vatAmount, data.totalAmount, data.paidAmount, currencyCode, exchangeRate, baseCurrencyAmount, baseCurrencyPaid, data.status, data.notes];
      let sql = `WITH inv AS (INSERT INTO purchase_invoices (company_id,invoice_number,supplier_id,purchase_order_id,date,due_date,subtotal,discount_amount,vat_amount,total_amount,paid_amount,currency_code,exchange_rate,base_currency_amount,base_currency_paid,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING id)`;
      if (data.lines?.length) {
        const lineValues: string[] = [];
        for (const line of data.lines) {
          const lc = line.currencyCode || currencyCode;
          const lr = line.exchangeRate ?? exchangeRate;
          const lb = line.baseCurrencyLineTotal ?? (line.lineTotal * lr);
          const off = params.length;
          lineValues.push(`($${off + 1},$${off + 2},$${off + 3},$${off + 4},$${off + 5},$${off + 6},$${off + 7},$${off + 8},$${off + 9})`);
          params.push(
            line.productId,
            line.quantity,
            line.unitPrice,
            line.discountPercent ?? 0,
            line.vatPercent ?? 0,
            line.lineTotal,
            lc,
            lr,
            lb,
          );
        }
        sql += `,lines_ins AS (INSERT INTO purchase_invoice_lines (invoice_id,product_id,quantity,unit_price,discount_percent,vat_percent,line_total,currency_code,exchange_rate,base_currency_line_total) SELECT inv.id,v.* FROM inv JOIN (VALUES ${lineValues.join(',')}) v(product_id,quantity,unit_price,discount_percent,vat_percent,line_total,currency_code,exchange_rate,base_currency_line_total) ON true)`;
      }
      sql += ' SELECT id FROM inv';
      const result = await adapter.query(sql, params);
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id as string };
      }
      return { success: false, error: result.error };
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
      if (data.currencyCode !== undefined) { fields.push(`currency_code = $${idx++}`); values.push(data.currencyCode); }
      if (data.exchangeRate !== undefined) { fields.push(`exchange_rate = $${idx++}`); values.push(data.exchangeRate); }
      if (data.baseCurrencyAmount !== undefined) { fields.push(`base_currency_amount = $${idx++}`); values.push(data.baseCurrencyAmount); }
      if (data.baseCurrencyPaid !== undefined) { fields.push(`base_currency_paid = $${idx++}`); values.push(data.baseCurrencyPaid); }
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
        { sql: 'DELETE FROM purchase_invoice_lines WHERE invoice_id = $1 AND $2 = (SELECT company_id FROM purchase_invoices WHERE id = $1)', params: [id, companyId] },
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

  async getOrdersPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { status?: string; supplierId?: string }
  ): Promise<PaginatedQueryResult<PurchaseOrder>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['po.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`po.status = $${params.length}`);
      }
      if (filters?.supplierId) {
        params.push(filters.supplierId);
        conditions.push(`po.supplier_id = $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM purchase_orders po WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT po.*, s.name as supplier_name, s.id as supplier_id
         FROM purchase_orders po
         LEFT JOIN suppliers s ON po.supplier_id = s.id
         WHERE ${where}
         ORDER BY po.date DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = (dataResult.rows || []).map((row: Record<string, unknown>) => mapOrder(row));
      return { success: true, data: paginatedResult(items, total, p, ps) };
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
      const params: unknown[] = [data.companyId, data.orderNumber, data.supplierId, data.date, data.expectedDate, data.totalAmount, data.status, data.notes];
      let sql = `WITH ord AS (INSERT INTO purchase_orders (company_id,order_number,supplier_id,date,expected_date,total_amount,status,notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id)`;
      if (data.lines?.length) {
        const lineValues: string[] = [];
        for (const line of data.lines) {
          const off = params.length;
          lineValues.push(`($${off + 1},$${off + 2},$${off + 3},$${off + 4},$${off + 5},$${off + 6})`);
          params.push(line.productId, line.description ?? null, line.quantity, line.unitPrice, line.lineTotal, line.receivedQuantity ?? 0);
        }
        sql += `,lines_ins AS (INSERT INTO purchase_order_lines (order_id,product_id,description,quantity,unit_price,line_total,received_quantity) SELECT ord.id,v.* FROM ord JOIN (VALUES ${lineValues.join(',')}) v(product_id,description,quantity,unit_price,line_total,received_quantity) ON true)`;
      }
      sql += ' SELECT id FROM ord';
      const result = await adapter.query(sql, params);
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id as string };
      }
      return { success: false, error: result.error };
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
        { sql: 'DELETE FROM purchase_order_lines WHERE order_id = $1 AND $2 = (SELECT company_id FROM purchase_orders WHERE id = $1)', params: [id, companyId] },
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

      const today = new Date().toISOString().split('T')[0];
      const seq = await getNextDocumentNumber(companyId, 'purchase_invoice');
      if (!seq.success || !seq.number) {
        return { success: false, error: seq.error || 'Failed to generate invoice number' };
      }

      const invData: Omit<PurchaseInvoice, 'id'> = {
        companyId,
        invoiceNumber: seq.number,
        supplierId: order.data.supplierId,
        purchaseOrderId: orderId,
        date: today,
        dueDate: order.data.expectedDate || today,
        subtotal: order.data.totalAmount,
        discountAmount: 0,
        vatAmount: 0,
        totalAmount: order.data.totalAmount,
        paidAmount: 0,
        status: 'draft',
        notes: `تم التحويل من أمر الشراء ${order.data.orderNumber}`,
        lines: (order.data.lines || []).map(l => ({
          productId: l.productId,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          discountPercent: 0,
          vatPercent: 0,
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

  async getReturnsPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { status?: string; supplierId?: string }
  ): Promise<PaginatedQueryResult<PurchaseReturn>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['r.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`r.status = $${params.length}`);
      }
      if (filters?.supplierId) {
        params.push(filters.supplierId);
        conditions.push(`r.supplier_id = $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM purchase_returns r WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT r.*, s.name as supplier_name, s.id as supplier_id
         FROM purchase_returns r
         LEFT JOIN suppliers s ON r.supplier_id = s.id
         WHERE ${where}
         ORDER BY r.date DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = (dataResult.rows || []).map((row: Record<string, unknown>) => mapReturn(row));
      return { success: true, data: paginatedResult(items, total, p, ps) };
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
      const params: unknown[] = [data.companyId, data.returnNumber, data.invoiceId || null, data.supplierId, data.date, data.subtotal, data.vatAmount, data.totalAmount, data.status, data.notes, data.reason];
      let sql = `WITH ret AS (INSERT INTO purchase_returns (company_id,return_number,invoice_id,supplier_id,date,subtotal,vat_amount,total_amount,status,notes,reason) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id)`;
      if (data.lines?.length) {
        const lineValues: string[] = [];
        for (const line of data.lines) {
          const off = params.length;
          lineValues.push(`($${off + 1},$${off + 2},$${off + 3},$${off + 4},$${off + 5})`);
          params.push(line.productId, line.description ?? null, line.quantity, line.unitPrice, line.lineTotal);
        }
        sql += `,lines_ins AS (INSERT INTO purchase_return_lines (return_id,product_id,description,quantity,unit_price,line_total) SELECT ret.id,v.* FROM ret JOIN (VALUES ${lineValues.join(',')}) v(product_id,description,quantity,unit_price,line_total) ON true)`;
      }
      sql += ' SELECT id FROM ret';
      const result = await adapter.query(sql, params);
      if (result.success && result.rows?.[0]) {
        return { success: true, id: result.rows[0].id as string };
      }
      return { success: false, error: result.error };
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
        { sql: 'DELETE FROM purchase_return_lines WHERE return_id = $1 AND $2 = (SELECT company_id FROM purchase_returns WHERE id = $1)', params: [id, companyId] },
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

  // ─── Dashboard KPIs ────────────────────────────────────────────────────────────
  async getPurchasesKpis(companyId: string): Promise<{
    success: boolean;
    data?: {
      totalOrders: number;
      pendingOrders: number;
      totalInvoicesValue: number;
      apOutstanding: number;
    };
    error?: string;
  }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const [ordersResult, pendingResult, invoicesResult, apResult] = await Promise.all([
        adapter.query<{ cnt: string | number }>(
          `SELECT COUNT(*)::int AS cnt FROM purchase_orders WHERE company_id = $1`,
          [companyId],
        ),
        adapter.query<{ cnt: string | number }>(
          `SELECT COUNT(*)::int AS cnt FROM purchase_orders WHERE company_id = $1 AND status IN ('draft', 'confirmed')`,
          [companyId],
        ),
        adapter.query<{ total: string | number }>(
          `SELECT COALESCE(SUM(total_amount), 0) AS total FROM purchase_invoices WHERE company_id = $1 AND status != 'cancelled'`,
          [companyId],
        ),
        adapter.query<{ total: string | number }>(
          `SELECT COALESCE(SUM(total_amount - paid_amount), 0) AS total FROM purchase_invoices WHERE company_id = $1 AND status IN ('posted', 'partially_paid')`,
          [companyId],
        ),
      ]);
      return {
        success: true,
        data: {
          totalOrders: toNum(ordersResult.rows?.[0]?.cnt),
          pendingOrders: toNum(pendingResult.rows?.[0]?.cnt),
          totalInvoicesValue: toNum(invoicesResult.rows?.[0]?.total),
          apOutstanding: toNum(apResult.rows?.[0]?.total),
        },
      };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
};

