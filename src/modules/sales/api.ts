import { getDbAdapter } from '@/core/database/adapters';
import { mapRows } from '@/core/utils/mapPgRow';
import { validateInput, idCompanySchema, companyIdSchema, uuidSchema, createCustomerSchema, createInvoiceSchema, createQuotationSchema, createSalesReturnSchema } from '@/core/utils/validation';
import type { Customer, SalesInvoice, SalesInvoiceLine, Quotation, QuotationLine, SalesReturn, SalesReturnLine, CustomerStatementRow, CustomerArAging } from './types';

export const salesApi = {
  // ─── Customers ────────────────────────────────────────────────────────────
  async getCustomers(companyId: string): Promise<{ success: boolean; data?: Customer[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        'SELECT * FROM customers WHERE company_id = $1 ORDER BY name',
        [companyId]
      );
      if (result.success) return { success: true, data: mapRows<Customer>(result.rows) };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getCustomerById(id: string, companyId: string): Promise<{ success: boolean; data?: Customer; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('SELECT * FROM customers WHERE id = $1 AND company_id = $2 LIMIT 1', [id, companyId]);
      if (result.success && result.rows?.[0]) return { success: true, data: mapRows<Customer>([result.rows[0]])[0] };
      return { success: false, error: result.error || 'Not found' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createCustomer(data: Omit<Customer, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createCustomerSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `INSERT INTO customers (company_id, code, name, phone, email, address, tax_number, credit_limit, balance, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
        [data.companyId, data.code, data.name, data.phone, data.email, data.address, data.taxNumber, data.creditLimit, data.balance, data.isActive]
      );
      if (result.success && result.rows?.[0]) return { success: true, id: result.rows[0].id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateCustomer(id: string, companyId: string, data: Partial<Omit<Customer, 'id' | 'companyId'>>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.name !== undefined) { fields.push(`name = $${idx++}`); values.push(data.name); }
      if (data.phone !== undefined) { fields.push(`phone = $${idx++}`); values.push(data.phone); }
      if (data.email !== undefined) { fields.push(`email = $${idx++}`); values.push(data.email); }
      if (data.address !== undefined) { fields.push(`address = $${idx++}`); values.push(data.address); }
      if (data.taxNumber !== undefined) { fields.push(`tax_number = $${idx++}`); values.push(data.taxNumber); }
      if (data.creditLimit !== undefined) { fields.push(`credit_limit = $${idx++}`); values.push(data.creditLimit); }
      if (data.balance !== undefined) { fields.push(`balance = $${idx++}`); values.push(data.balance); }
      if (data.isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(data.isActive); }
      if (fields.length === 0) return { success: true };
      values.push(id);
      values.push(companyId);
      const result = await adapter.query(`UPDATE customers SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteCustomer(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM customers WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getCustomerStatement(customerId: string): Promise<{ success: boolean; data?: CustomerStatementRow[]; error?: string }> {
    try {
      const cidValidation = validateInput(uuidSchema, customerId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT date, 'فاتورة' as document_type, invoice_number as document_number, total_amount as debit, paid_amount as credit, (total_amount - paid_amount) as balance, notes
        FROM sales_invoices WHERE customer_id = $1 AND status <> 'cancelled'
        UNION ALL
        SELECT date, 'سند قبض' as document_type, invoice_number as document_number, 0 as debit, paid_amount as credit, 0 as balance, notes
        FROM sales_invoices WHERE customer_id = $1 AND paid_amount > 0
        ORDER BY date DESC`,
        [customerId]
      );
      if (result.success) return { success: true, data: result.rows as CustomerStatementRow[] };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getCustomerArAging(companyId: string): Promise<{ success: boolean; data?: CustomerArAging[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT c.id as customer_id, c.name as customer_name, i.total_amount - i.paid_amount as due_amount, i.date
        FROM customers c
        JOIN sales_invoices i ON i.customer_id = c.id
        WHERE c.company_id = $1 AND i.status IN ('posted', 'partially_paid')`,
        [companyId]
      );
      if (!result.success) return { success: false, error: result.error };
      const rows = result.rows as Array<Record<string, unknown>>;
      const map = new Map<string, CustomerArAging>();
      const now = new Date();
      for (const r of rows) {
        const cid = String(r.customer_id);
        const cname = String(r.customer_name);
        const due = Number(r.due_amount) || 0;
        const date = new Date(String(r.date));
        const days = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
        const period = days <= 30 ? '0-30' : days <= 60 ? '31-60' : days <= 90 ? '61-90' : '>90';
        if (!map.has(cid)) {
          map.set(cid, { customerId: cid, customerName: cname, totalDue: 0, buckets: [
            { period: '0-30', amount: 0, count: 0 },
            { period: '31-60', amount: 0, count: 0 },
            { period: '61-90', amount: 0, count: 0 },
            { period: '>90', amount: 0, count: 0 },
          ] });
        }
        const entry = map.get(cid)!;
        entry.totalDue += due;
        const b = entry.buckets.find(x => x.period === period);
        if (b) { b.amount += due; b.count += 1; }
      }
      return { success: true, data: Array.from(map.values()) };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Sales Invoices ───────────────────────────────────────────────────────
  async getInvoices(companyId: string): Promise<{ success: boolean; data?: SalesInvoice[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, c.tax_number as customer_tax_number, c.balance as customer_balance, c.is_active as customer_is_active
        FROM sales_invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.company_id = $1
        ORDER BY i.date DESC`,
        [companyId]
      );
      if (!result.success) return { success: false, error: result.error };
      const invoices = (result.rows || []).map((row: Record<string, unknown>) => mapInvoiceRow(row));
      return { success: true, data: invoices };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getInvoiceById(id: string, companyId: string): Promise<{ success: boolean; data?: SalesInvoice; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const invResult = await adapter.query(
        `SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, c.tax_number as customer_tax_number, c.balance as customer_balance, c.is_active as customer_is_active
        FROM sales_invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = $1 AND i.company_id = $2 LIMIT 1`, [id, companyId]
      );
      if (!invResult.success || !invResult.rows?.[0]) return { success: false, error: invResult.error || 'Not found' };
      const invoice = mapInvoiceRow(invResult.rows[0]);
      const linesResult = await adapter.query(
        `SELECT l.*, p.name_ar as product_name FROM sales_invoice_lines l LEFT JOIN products p ON l.product_id = p.id WHERE l.invoice_id = $1`, [id]
      );
      invoice.lines = (linesResult.rows || []).map((r: Record<string, unknown>) => mapInvoiceLineRow(r));
      return { success: true, data: invoice };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createInvoice(data: Omit<SalesInvoice, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createInvoiceSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const queries: { sql: string; params: unknown[] }[] = [
        { sql: `INSERT INTO sales_invoices (company_id, invoice_number, customer_id, date, due_date, subtotal, discount_amount, vat_amount, total_amount, paid_amount, status, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id`,
        params: [data.companyId, data.invoiceNumber, data.customerId, data.date, data.dueDate, data.subtotal, data.discountAmount, data.vatAmount, data.totalAmount, data.paidAmount, data.status, data.notes] },
      ];
      let lineIdx = 13;
      for (const line of data.lines) {
        queries.push({
          sql: `INSERT INTO sales_invoice_lines (invoice_id, product_id, quantity, unit_price, discount_percent, vat_percent, line_total)
          VALUES ((SELECT id FROM sales_invoices WHERE invoice_number = $2 AND company_id = $1 LIMIT 1), $${lineIdx}, $${lineIdx + 1}, $${lineIdx + 2}, $${lineIdx + 3}, $${lineIdx + 4}, $${lineIdx + 5})`,
          params: [data.companyId, data.invoiceNumber, line.productId, line.quantity, line.unitPrice, line.discountPercent, line.vatPercent, line.lineTotal]
        });
        lineIdx += 6;
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

  async updateInvoice(id: string, companyId: string, data: Partial<Omit<SalesInvoice, 'id' | 'companyId' | 'lines'>> & { lines?: SalesInvoiceLine[] }): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.customerId !== undefined) { fields.push(`customer_id = $${idx++}`); values.push(data.customerId); }
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.dueDate !== undefined) { fields.push(`due_date = $${idx++}`); values.push(data.dueDate); }
      if (data.subtotal !== undefined) { fields.push(`subtotal = $${idx++}`); values.push(data.subtotal); }
      if (data.discountAmount !== undefined) { fields.push(`discount_amount = $${idx++}`); values.push(data.discountAmount); }
      if (data.vatAmount !== undefined) { fields.push(`vat_amount = $${idx++}`); values.push(data.vatAmount); }
      if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
      if (data.paidAmount !== undefined) { fields.push(`paid_amount = $${idx++}`); values.push(data.paidAmount); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
      if (fields.length > 0) {
        values.push(id);
        values.push(companyId);
        await adapter.query(`UPDATE sales_invoices SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values);
      }
      if (data.lines) {
        await adapter.query('DELETE FROM sales_invoice_lines WHERE invoice_id = $1', [id]);
        for (const line of data.lines) {
          await adapter.query(
            `INSERT INTO sales_invoice_lines (invoice_id, product_id, quantity, unit_price, discount_percent, vat_percent, line_total)
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [id, line.productId, line.quantity, line.unitPrice, line.discountPercent, line.vatPercent, line.lineTotal]
          );
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteInvoice(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM sales_invoices WHERE id = $1 AND company_id = $2', [id, companyId]);
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
      const result = await adapter.query(`UPDATE sales_invoices SET status = 'posted' WHERE id = $1 AND company_id = $2 AND status = 'draft'`, [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Quotations ───────────────────────────────────────────────────────────
  async getQuotations(companyId: string): Promise<{ success: boolean; data?: Quotation[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.company_id = $1 ORDER BY q.date DESC`,
        [companyId]
      );
      if (!result.success) return { success: false, error: result.error };
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapQuotationRow(r));
      return { success: true, data: rows };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getQuotationById(id: string, companyId: string): Promise<{ success: boolean; data?: Quotation; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const res = await adapter.query(`SELECT q.*, c.name as customer_name FROM quotations q LEFT JOIN customers c ON q.customer_id = c.id WHERE q.id = $1 AND q.company_id = $2 LIMIT 1`, [id, companyId]);
      if (!res.success || !res.rows?.[0]) return { success: false, error: res.error || 'Not found' };
      const q = mapQuotationRow(res.rows[0]);
      const linesRes = await adapter.query(`SELECT l.*, p.name_ar as product_name FROM quotation_lines l LEFT JOIN products p ON l.product_id = p.id WHERE l.quotation_id = $1`, [id]);
      q.lines = (linesRes.rows || []).map((r: Record<string, unknown>) => mapQuotationLineRow(r));
      return { success: true, data: q };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createQuotation(data: Omit<Quotation, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createQuotationSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const queries: { sql: string; params: unknown[] }[] = [
        { sql: `INSERT INTO quotations (company_id, quotation_number, customer_id, date, expiry_date, total_amount, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
        params: [data.companyId, data.quotationNumber, data.customerId, data.date, data.expiryDate, data.totalAmount, data.status, data.notes] },
      ];
      let lineIdx = 9;
      for (const line of data.lines) {
        queries.push({
          sql: `INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, discount_percent, line_total) VALUES ((SELECT id FROM quotations WHERE quotation_number = $2 AND company_id = $1 LIMIT 1), $${lineIdx}, $${lineIdx + 1}, $${lineIdx + 2}, $${lineIdx + 3}, $${lineIdx + 4})`,
          params: [data.companyId, data.quotationNumber, line.productId, line.quantity, line.unitPrice, line.discountPercent, line.lineTotal]
        });
        lineIdx += 5;
      }
      const txResult = await adapter.transaction(queries);
      if (txResult.success && txResult.results?.[0]?.[0]) {
        const qid = txResult.results[0][0].id as string;
        return { success: true, id: qid };
      }
      return { success: false, error: txResult.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateQuotation(id: string, companyId: string, data: Partial<Omit<Quotation, 'id' | 'companyId' | 'lines'>> & { lines?: QuotationLine[] }): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.customerId !== undefined) { fields.push(`customer_id = $${idx++}`); values.push(data.customerId); }
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.expiryDate !== undefined) { fields.push(`expiry_date = $${idx++}`); values.push(data.expiryDate); }
      if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
      if (fields.length > 0) { values.push(id); values.push(companyId); await adapter.query(`UPDATE quotations SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values); }
      if (data.lines) {
        await adapter.query('DELETE FROM quotation_lines WHERE quotation_id = $1', [id]);
        for (const line of data.lines) {
          await adapter.query(`INSERT INTO quotation_lines (quotation_id, product_id, quantity, unit_price, discount_percent, line_total) VALUES ($1,$2,$3,$4,$5,$6)`,
            [id, line.productId, line.quantity, line.unitPrice, line.discountPercent, line.lineTotal]);
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteQuotation(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM quotations WHERE id = $1 AND company_id = $2', [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async convertQuotationToInvoice(id: string, companyId: string, invoiceData: Omit<SalesInvoice, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const createRes = await this.createInvoice(invoiceData);
      if (createRes.success) {
        const adapter = await getDbAdapter();
        await adapter.query(`UPDATE quotations SET status = 'converted' WHERE id = $1 AND company_id = $2`, [id, companyId]);
      }
      return createRes;
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Sales Returns ────────────────────────────────────────────────────────
  async getReturns(companyId: string): Promise<{ success: boolean; data?: SalesReturn[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT r.*, c.name as customer_name, i.invoice_number as invoice_number_ref FROM sales_returns r LEFT JOIN customers c ON r.customer_id = c.id LEFT JOIN sales_invoices i ON r.invoice_id = i.id WHERE r.company_id = $1 ORDER BY r.date DESC`,
        [companyId]
      );
      if (!result.success) return { success: false, error: result.error };
      const rows = (result.rows || []).map((r: Record<string, unknown>) => mapReturnRow(r));
      return { success: true, data: rows };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getReturnById(id: string, companyId: string): Promise<{ success: boolean; data?: SalesReturn; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const res = await adapter.query(
        `SELECT r.*, c.name as customer_name, i.invoice_number as invoice_number_ref FROM sales_returns r LEFT JOIN customers c ON r.customer_id = c.id LEFT JOIN sales_invoices i ON r.invoice_id = i.id WHERE r.id = $1 AND r.company_id = $2 LIMIT 1`, [id, companyId]
      );
      if (!res.success || !res.rows?.[0]) return { success: false, error: res.error || 'Not found' };
      const ret = mapReturnRow(res.rows[0]);
      const linesRes = await adapter.query(`SELECT l.*, p.name_ar as product_name FROM sales_return_lines l LEFT JOIN products p ON l.product_id = p.id WHERE l.return_id = $1`, [id]);
      ret.lines = (linesRes.rows || []).map((r: Record<string, unknown>) => mapReturnLineRow(r));
      return { success: true, data: ret };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createReturn(data: Omit<SalesReturn, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createSalesReturnSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const queries: { sql: string; params: unknown[] }[] = [
        { sql: `INSERT INTO sales_returns (company_id, return_number, invoice_id, customer_id, date, subtotal, vat_amount, total_amount, reason, status, notes) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
        params: [data.companyId, data.returnNumber, data.invoiceId, data.customerId, data.date, data.subtotal, data.vatAmount, data.totalAmount, data.reason, data.status, data.notes] },
      ];
      let lineIdx = 12;
      for (const line of data.lines) {
        queries.push({
          sql: `INSERT INTO sales_return_lines (return_id, product_id, quantity, unit_price, line_total) VALUES ((SELECT id FROM sales_returns WHERE return_number = $2 AND company_id = $1 LIMIT 1), $${lineIdx}, $${lineIdx + 1}, $${lineIdx + 2}, $${lineIdx + 3})`,
          params: [data.companyId, data.returnNumber, line.productId, line.quantity, line.unitPrice, line.lineTotal]
        });
        lineIdx += 4;
      }
      const txResult = await adapter.transaction(queries);
      if (txResult.success && txResult.results?.[0]?.[0]) {
        const rid = txResult.results[0][0].id as string;
        return { success: true, id: rid };
      }
      return { success: false, error: txResult.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateReturn(id: string, companyId: string, data: Partial<Omit<SalesReturn, 'id' | 'companyId' | 'lines'>> & { lines?: SalesReturnLine[] }): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.invoiceId !== undefined) { fields.push(`invoice_id = $${idx++}`); values.push(data.invoiceId); }
      if (data.customerId !== undefined) { fields.push(`customer_id = $${idx++}`); values.push(data.customerId); }
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.subtotal !== undefined) { fields.push(`subtotal = $${idx++}`); values.push(data.subtotal); }
      if (data.vatAmount !== undefined) { fields.push(`vat_amount = $${idx++}`); values.push(data.vatAmount); }
      if (data.totalAmount !== undefined) { fields.push(`total_amount = $${idx++}`); values.push(data.totalAmount); }
      if (data.reason !== undefined) { fields.push(`reason = $${idx++}`); values.push(data.reason); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
      if (fields.length > 0) { values.push(id); values.push(companyId); await adapter.query(`UPDATE sales_returns SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`, values); }
      if (data.lines) {
        await adapter.query('DELETE FROM sales_return_lines WHERE return_id = $1', [id]);
        for (const line of data.lines) {
          await adapter.query(`INSERT INTO sales_return_lines (return_id, product_id, quantity, unit_price, line_total) VALUES ($1,$2,$3,$4,$5)`,
            [id, line.productId, line.quantity, line.unitPrice, line.lineTotal]);
        }
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteReturn(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query('DELETE FROM sales_returns WHERE id = $1 AND company_id = $2', [id, companyId]);
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
      const result = await adapter.query(`UPDATE sales_returns SET status = 'posted' WHERE id = $1 AND company_id = $2 AND status = 'draft'`, [id, companyId]);
      return { success: result.success, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
};

// ─── Row Mappers ────────────────────────────────────────────────────────────
function mapInvoiceRow(row: Record<string, unknown>): SalesInvoice {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    invoiceNumber: String(row.invoice_number),
    customerId: String(row.customer_id),
    customer: row.customer_name ? {
      id: String(row.customer_id),
      companyId: String(row.company_id),
      name: String(row.customer_name),
      phone: row.customer_phone ? String(row.customer_phone) : undefined,
      email: row.customer_email ? String(row.customer_email) : undefined,
      address: row.customer_address ? String(row.customer_address) : undefined,
      taxNumber: row.customer_tax_number ? String(row.customer_tax_number) : undefined,
      balance: Number(row.customer_balance) || 0,
      isActive: row.customer_is_active === true || row.customer_is_active === 'true',
    } : undefined,
    date: String(row.date),
    dueDate: row.due_date ? String(row.due_date) : undefined,
    subtotal: Number(row.subtotal) || 0,
    discountAmount: Number(row.discount_amount) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    paidAmount: Number(row.paid_amount) || 0,
    status: String(row.status) as SalesInvoice['status'],
    notes: row.notes ? String(row.notes) : undefined,
    lines: [],
  };
}

function mapInvoiceLineRow(row: Record<string, unknown>): SalesInvoiceLine {
  return {
    id: row.id ? String(row.id) : undefined,
    invoiceId: row.invoice_id ? String(row.invoice_id) : undefined,
    productId: String(row.product_id),
    productName: row.product_name ? String(row.product_name) : undefined,
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
    discountPercent: Number(row.discount_percent) || 0,
    vatPercent: Number(row.vat_percent) || 0,
    lineTotal: Number(row.line_total) || 0,
  };
}

function mapQuotationRow(row: Record<string, unknown>): Quotation {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    quotationNumber: String(row.quotation_number),
    customerId: String(row.customer_id),
    customer: row.customer_name ? { id: String(row.customer_id), companyId: String(row.company_id), name: String(row.customer_name), balance: 0, isActive: true } : undefined,
    date: String(row.date),
    expiryDate: row.expiry_date ? String(row.expiry_date) : undefined,
    totalAmount: Number(row.total_amount) || 0,
    status: String(row.status) as Quotation['status'],
    notes: row.notes ? String(row.notes) : undefined,
    lines: [],
  };
}

function mapQuotationLineRow(row: Record<string, unknown>): QuotationLine {
  return {
    id: row.id ? String(row.id) : undefined,
    quotationId: row.quotation_id ? String(row.quotation_id) : undefined,
    productId: String(row.product_id),
    productName: row.product_name ? String(row.product_name) : undefined,
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
    discountPercent: Number(row.discount_percent) || 0,
    lineTotal: Number(row.line_total) || 0,
  };
}

function mapReturnRow(row: Record<string, unknown>): SalesReturn {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    returnNumber: String(row.return_number),
    invoiceId: String(row.invoice_id),
    invoice: row.invoice_number_ref ? { id: String(row.invoice_id), companyId: String(row.company_id), invoiceNumber: String(row.invoice_number_ref), customerId: '', date: '', subtotal: 0, discountAmount: 0, vatAmount: 0, totalAmount: 0, paidAmount: 0, status: 'posted', lines: [] } : undefined,
    customerId: String(row.customer_id),
    customer: row.customer_name ? { id: String(row.customer_id), companyId: String(row.company_id), name: String(row.customer_name), balance: 0, isActive: true } : undefined,
    date: String(row.date),
    subtotal: Number(row.subtotal) || 0,
    vatAmount: Number(row.vat_amount) || 0,
    totalAmount: Number(row.total_amount) || 0,
    reason: String(row.reason),
    status: String(row.status) as SalesReturn['status'],
    notes: row.notes ? String(row.notes) : undefined,
    lines: [],
  };
}

function mapReturnLineRow(row: Record<string, unknown>): SalesReturnLine {
  return {
    id: row.id ? String(row.id) : undefined,
    returnId: row.return_id ? String(row.return_id) : undefined,
    productId: String(row.product_id),
    productName: row.product_name ? String(row.product_name) : undefined,
    quantity: Number(row.quantity) || 0,
    unitPrice: Number(row.unit_price) || 0,
    lineTotal: Number(row.line_total) || 0,
  };
}
