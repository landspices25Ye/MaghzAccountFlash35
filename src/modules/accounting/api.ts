import { getDbAdapter } from '@/core/database/adapters';
import { mapRows } from '@/core/utils/mapPgRow';
import { validateInput, idCompanySchema, companyIdSchema, createTransactionSchema, createReceiptVoucherSchema, createPaymentVoucherSchema } from '@/core/utils/validation';
import { clampPageArgs, paginatedResult, type PaginatedQueryResult } from '@/core/utils/pagination';
import { YER_CODE } from '@/core/utils/currencyConverter';
import type { Account, Transaction, JournalEntry, TrialBalanceRow, LedgerRow, ReceiptVoucher, PaymentVoucher } from './types';

export const accountingApi = {
  // ─── Chart of Accounts ────────────────────────────────────────────────────
  async getAccounts(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.getAccounts(companyId);

      if (result.success && result.data) {
        let accounts = mapRows<Account>(result.data);

        if (ownedByUserId) {
          const filterResult = await adapter.query(
            `SELECT * FROM accounts WHERE company_id = $1 AND created_by = $2`,
            [companyId, ownedByUserId]
          );
          if (filterResult.success && filterResult.rows) {
            accounts = mapRows<Account>(filterResult.rows);
          }
        }

        const accountMap = new Map<string, Account>();
        const rootAccounts: Account[] = [];

        accounts.forEach(acc => {
          accountMap.set(acc.id, { ...acc, children: [] });
        });

        accounts.forEach(acc => {
          const node = accountMap.get(acc.id)!;
          if (acc.parentId && accountMap.has(acc.parentId)) {
            const parent = accountMap.get(acc.parentId)!;
            if (!parent.children) parent.children = [];
            parent.children.push(node);
          } else {
            rootAccounts.push(node);
          }
        });

        return { success: true, data: rootAccounts };
      }

      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createAccount(data: Omit<Account, 'id'>, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, data.companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      const id = crypto.randomUUID();
      const result = await adapter.query(
        `INSERT INTO accounts (id, company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [id, data.companyId, data.code, data.nameAr, data.nameEn, data.parentId, data.type, data.nature, data.isGroup, data.balance, data.isActive, userId, userId]
      );
      if (result.success) return { success: true, id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateAccount(id: string, companyId: string, userId: string, data: Partial<Account>): Promise<{ success: boolean; error?: string }> {
    try {
      const cidValidation = validateInput(idCompanySchema, { id, companyId });
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      return await adapter.query(
        `UPDATE accounts SET name_ar = $1, name_en = $2, code = $3, parent_id = $4, type = $5, nature = $6, is_group = $7, is_active = $8, updated_at = NOW(), updated_by = $9 WHERE id = $10 AND company_id = $11`,
        [data.nameAr, data.nameEn, data.code, data.parentId, data.type, data.nature, data.isGroup, data.isActive, userId, id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteAccount(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const checkResult = await adapter.query<{ count: number }>(
        `SELECT COUNT(*) as count FROM journal_entries WHERE account_id = $1 AND company_id = $2`,
        [id, companyId]
      );
      const count = Number(checkResult.rows?.[0]?.count) || 0;
      if (count > 0) {
        return { success: false, error: 'لا يمكن حذف حساب له قيود يومية' };
      }
      return await adapter.query(`DELETE FROM accounts WHERE id = $1 AND company_id = $2`, [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getAccountById(id: string, companyId: string): Promise<{ success: boolean; data?: Account; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT * FROM accounts WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
      if (result.success && result.rows && result.rows.length > 0) {
        return { success: true, data: mapRows<Account>([result.rows[0]])[0] };
      }
      return { success: false, error: 'Account not found' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Journal Entries ──────────────────────────────────────────────────────
  async getTransactions(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      if (ownedByUserId) {
        const result = await adapter.query(
          `SELECT t.* FROM transactions t WHERE t.company_id = $1 AND t.created_by = $2 ORDER BY t.date DESC`,
          [companyId, ownedByUserId]
        );
        return { success: result.success, data: mapRows<Transaction>(result.rows), error: result.error };
      }
      const result = await adapter.getTransactions(companyId);
      return { success: result.success, data: mapRows<Transaction>(result.data), error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getTransactionsPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { status?: string; createdBy?: string }
  ): Promise<PaginatedQueryResult<Transaction>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['t.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`t.status = $${params.length}`);
      }
      if (filters?.createdBy) {
        params.push(filters.createdBy);
        conditions.push(`t.created_by = $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM transactions t WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT t.* FROM transactions t WHERE ${where} ORDER BY t.date DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = mapRows<Transaction>(dataResult.rows || []);
      return { success: true, data: paginatedResult(items, total, p, ps) };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getTransactionById(id: string, companyId: string): Promise<{ success: boolean; data?: Transaction; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const result = await adapter.query(
        `SELECT * FROM transactions WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
      if (result.success && result.rows && result.rows.length > 0) {
        const tx = mapRows<Transaction>([result.rows[0]])[0];
        const entriesResult = await adapter.query(
          `SELECT je.*, a.name_ar as account_name, a.code as account_code
          FROM journal_entries je
          LEFT JOIN accounts a ON je.account_id = a.id
          WHERE je.transaction_id = $1`,
          [id]
        );
        interface EntryRow {
          id: string;
          transaction_id: string;
          account_id: string;
          account_name: string;
          account_code: string;
          debit: number;
          credit: number;
          memo: string;
        }
        tx.entries = (entriesResult.rows as EntryRow[] || []).map((row) => ({
          id: row.id,
          transactionId: row.transaction_id,
          accountId: row.account_id,
          account: { id: row.account_id, nameAr: row.account_name, code: row.account_code } as Account,
          debit: Number(row.debit) || 0,
          credit: Number(row.credit) || 0,
          memo: row.memo,
        }));
        return { success: true, data: tx };
      }
      return { success: false, error: 'Transaction not found' };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createTransaction(data: Omit<Transaction, 'id'>, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createTransactionSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const txId = crypto.randomUUID();
      const queries: { sql: string; params: unknown[] }[] = [
        {
          sql: `INSERT INTO transactions (id, company_id, date, reference, description, total_amount, status, created_by, updated_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          params: [txId, data.companyId, data.date, data.reference, data.description, data.totalAmount, data.status || 'posted', userId, userId]
        },
      ];
      for (const entry of (data.entries as JournalEntry[])) {
        queries.push({
          sql: `INSERT INTO journal_entries (id, transaction_id, account_id, debit, credit, memo, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          params: [entry.id || crypto.randomUUID(), txId, entry.accountId, entry.debit, entry.credit, entry.memo, data.companyId]
        });
      }
      const txResult = await adapter.transaction(queries);
      if (txResult.success) {
        return { success: true, id: txId };
      }
      return { success: false, error: txResult.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateTransaction(id: string, companyId: string, userId: string, data: Partial<Transaction>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const txResult = await adapter.query(
        `UPDATE transactions SET date = $1, reference = $2, description = $3, total_amount = $4, status = $5, updated_at = NOW(), updated_by = $6 WHERE id = $7 AND company_id = $8`,
        [data.date, data.reference, data.description, data.totalAmount, data.status, userId, id, companyId]
      );
      if (!txResult.success) return txResult;

      if (data.entries && data.entries.length > 0) {
        const deleteResult = await adapter.query(`DELETE FROM journal_entries WHERE transaction_id = $1 AND company_id = $2`, [id, companyId]);
        if (!deleteResult.success) return deleteResult;

        const entryQueries: { sql: string; params: unknown[] }[] = data.entries.map((entry) => ({
          sql: `INSERT INTO journal_entries (id, transaction_id, account_id, debit, credit, memo, company_id) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          params: [entry.id || crypto.randomUUID(), id, entry.accountId, entry.debit, entry.credit, entry.memo, companyId]
        }));
        const entryResult = await adapter.transaction(entryQueries);
        if (!entryResult.success) return { success: false, error: entryResult.error };
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async postTransaction(id: string, companyId: string, userId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      if (userId) {
        return await adapter.query(
          `UPDATE transactions SET status = 'posted', updated_at = NOW(), updated_by = $1 WHERE id = $2 AND company_id = $3`,
          [userId, id, companyId]
        );
      }
      return await adapter.query(
        `UPDATE transactions SET status = 'posted', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteTransaction(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return await adapter.query(`DELETE FROM transactions WHERE id = $1 AND company_id = $2`, [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Receipt Vouchers ─────────────────────────────────────────────────────
  async getReceiptVouchers(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: ReceiptVoucher[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `
        SELECT rv.*, c.name as customer_name
        FROM receipt_vouchers rv
        LEFT JOIN customers c ON rv.customer_id = c.id
        WHERE rv.company_id = $1`;
      const params: unknown[] = [companyId];
      if (ownedByUserId) {
        sql += ` AND rv.created_by = $${params.length + 1}`;
        params.push(ownedByUserId);
      }
      sql += ` ORDER BY rv.date DESC`;
      const result = await adapter.query(sql, params);
      if (result.success && result.rows) {
        return { success: true, data: mapRows<ReceiptVoucher>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getReceiptVouchersPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { status?: string }
  ): Promise<PaginatedQueryResult<ReceiptVoucher>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['rv.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`rv.status = $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM receipt_vouchers rv WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT rv.*, c.name as customer_name
         FROM receipt_vouchers rv
         LEFT JOIN customers c ON rv.customer_id = c.id
         WHERE ${where}
         ORDER BY rv.date DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = mapRows<ReceiptVoucher>(dataResult.rows || []);
      return { success: true, data: paginatedResult(items, total, p, ps) };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createReceiptVoucher(data: Omit<ReceiptVoucher, 'id'>, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createReceiptVoucherSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const id = crypto.randomUUID();
      const currencyCode = data.currencyCode || YER_CODE;
      const exchangeRate = data.exchangeRate ?? 1;
      const baseCurrencyAmount = data.baseCurrencyAmount ?? (data.amount * exchangeRate);
      const result = await adapter.query(
        `INSERT INTO receipt_vouchers (id, company_id, voucher_number, date, customer_id, amount, currency_code, exchange_rate, base_currency_amount, payment_method, bank_account_id, cash_box_id, check_number, check_date, notes, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [id, data.companyId, data.voucherNumber, data.date, data.customerId, data.amount, currencyCode, exchangeRate, baseCurrencyAmount, data.paymentMethod, data.bankAccountId, data.cashBoxId, data.checkNumber, data.checkDate, data.notes, data.status, userId, userId]
      );
      if (result.success) return { success: true, id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updateReceiptVoucher(id: string, companyId: string, userId: string, data: Partial<ReceiptVoucher>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.customerId !== undefined) { fields.push(`customer_id = $${idx++}`); values.push(data.customerId); }
      if (data.amount !== undefined) { fields.push(`amount = $${idx++}`); values.push(data.amount); }
      if (data.currencyCode !== undefined) { fields.push(`currency_code = $${idx++}`); values.push(data.currencyCode); }
      if (data.exchangeRate !== undefined) { fields.push(`exchange_rate = $${idx++}`); values.push(data.exchangeRate); }
      if (data.baseCurrencyAmount !== undefined) { fields.push(`base_currency_amount = $${idx++}`); values.push(data.baseCurrencyAmount); }
      if (data.paymentMethod !== undefined) { fields.push(`payment_method = $${idx++}`); values.push(data.paymentMethod); }
      if (data.bankAccountId !== undefined) { fields.push(`bank_account_id = $${idx++}`); values.push(data.bankAccountId); }
      if (data.cashBoxId !== undefined) { fields.push(`cash_box_id = $${idx++}`); values.push(data.cashBoxId); }
      if (data.checkNumber !== undefined) { fields.push(`check_number = $${idx++}`); values.push(data.checkNumber); }
      if (data.checkDate !== undefined) { fields.push(`check_date = $${idx++}`); values.push(data.checkDate); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      fields.push(`updated_at = NOW()`);
      fields.push(`updated_by = $${idx++}`); values.push(userId);
      values.push(id);
      values.push(companyId);
      return await adapter.query(
        `UPDATE receipt_vouchers SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`,
        values
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deleteReceiptVoucher(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return await adapter.query(
        `DELETE FROM receipt_vouchers WHERE id = $1 AND company_id = $2`,
        [id, companyId]
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Payment Vouchers ─────────────────────────────────────────────────────
  async getPaymentVouchers(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: PaymentVoucher[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `
        SELECT pv.*, c.name as supplier_name, a.name_ar as expense_account_name
        FROM payment_vouchers pv
        LEFT JOIN suppliers c ON pv.supplier_id = c.id
        LEFT JOIN accounts a ON pv.expense_account_id = a.id
        WHERE pv.company_id = $1`;
      const params: unknown[] = [companyId];
      if (ownedByUserId) {
        sql += ` AND pv.created_by = $${params.length + 1}`;
        params.push(ownedByUserId);
      }
      sql += ` ORDER BY pv.date DESC`;
      const result = await adapter.query(sql, params);
      if (result.success && result.rows) {
        return { success: true, data: mapRows<PaymentVoucher>(result.rows) };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getPaymentVouchersPaginated(
    companyId: string,
    page: number,
    pageSize: number,
    filters?: { status?: string }
  ): Promise<PaginatedQueryResult<PaymentVoucher>> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const { page: p, pageSize: ps, offset } = clampPageArgs(page, pageSize);
      const adapter = await getDbAdapter();

      const conditions: string[] = ['pv.company_id = $1'];
      const params: unknown[] = [companyId];
      if (filters?.status) {
        params.push(filters.status);
        conditions.push(`pv.status = $${params.length}`);
      }
      const where = conditions.join(' AND ');

      const countResult = await adapter.query(
        `SELECT COUNT(*)::int AS total FROM payment_vouchers pv WHERE ${where}`,
        params
      );
      const total = Number(countResult.rows?.[0]?.total || 0);

      params.push(ps);
      params.push(offset);
      const limitIdx = params.length - 1;
      const offsetIdx = params.length;

      const dataResult = await adapter.query(
        `SELECT pv.*, c.name as supplier_name, a.name_ar as expense_account_name
         FROM payment_vouchers pv
         LEFT JOIN suppliers c ON pv.supplier_id = c.id
         LEFT JOIN accounts a ON pv.expense_account_id = a.id
         WHERE ${where}
         ORDER BY pv.date DESC
         LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      );
      if (!dataResult.success) return { success: false, error: dataResult.error };

      const items = mapRows<PaymentVoucher>(dataResult.rows || []);
      return { success: true, data: paginatedResult(items, total, p, ps) };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async createPaymentVoucher(data: Omit<PaymentVoucher, 'id'>, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createPaymentVoucherSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const id = crypto.randomUUID();
      const currencyCode = data.currencyCode || YER_CODE;
      const exchangeRate = data.exchangeRate ?? 1;
      const baseCurrencyAmount = data.baseCurrencyAmount ?? (data.amount * exchangeRate);
      const result = await adapter.query(
        `INSERT INTO payment_vouchers (id, company_id, voucher_number, date, supplier_id, expense_account_id, amount, currency_code, exchange_rate, base_currency_amount, payment_method, bank_account_id, cash_box_id, check_number, check_date, notes, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        [id, data.companyId, data.voucherNumber, data.date, data.supplierId, data.expenseAccountId, data.amount, currencyCode, exchangeRate, baseCurrencyAmount, data.paymentMethod, data.bankAccountId, data.cashBoxId, data.checkNumber, data.checkDate, data.notes, data.status, userId, userId]
      );
      if (result.success) return { success: true, id };
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async updatePaymentVoucher(id: string, companyId: string, userId: string, data: Partial<PaymentVoucher>): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      const fields: string[] = [];
      const values: unknown[] = [];
      let idx = 1;
      if (data.date !== undefined) { fields.push(`date = $${idx++}`); values.push(data.date); }
      if (data.supplierId !== undefined) { fields.push(`supplier_id = $${idx++}`); values.push(data.supplierId); }
      if (data.expenseAccountId !== undefined) { fields.push(`expense_account_id = $${idx++}`); values.push(data.expenseAccountId); }
      if (data.amount !== undefined) { fields.push(`amount = $${idx++}`); values.push(data.amount); }
      if (data.currencyCode !== undefined) { fields.push(`currency_code = $${idx++}`); values.push(data.currencyCode); }
      if (data.exchangeRate !== undefined) { fields.push(`exchange_rate = $${idx++}`); values.push(data.exchangeRate); }
      if (data.baseCurrencyAmount !== undefined) { fields.push(`base_currency_amount = $${idx++}`); values.push(data.baseCurrencyAmount); }
      if (data.paymentMethod !== undefined) { fields.push(`payment_method = $${idx++}`); values.push(data.paymentMethod); }
      if (data.bankAccountId !== undefined) { fields.push(`bank_account_id = $${idx++}`); values.push(data.bankAccountId); }
      if (data.cashBoxId !== undefined) { fields.push(`cash_box_id = $${idx++}`); values.push(data.cashBoxId); }
      if (data.checkNumber !== undefined) { fields.push(`check_number = $${idx++}`); values.push(data.checkNumber); }
      if (data.checkDate !== undefined) { fields.push(`check_date = $${idx++}`); values.push(data.checkDate); }
      if (data.notes !== undefined) { fields.push(`notes = $${idx++}`); values.push(data.notes); }
      if (data.status !== undefined) { fields.push(`status = $${idx++}`); values.push(data.status); }
      fields.push(`updated_at = NOW()`);
      fields.push(`updated_by = $${idx++}`); values.push(userId);
      values.push(id);
      values.push(companyId);
      return await adapter.query(
        `UPDATE payment_vouchers SET ${fields.join(', ')} WHERE id = $${idx} AND company_id = $${idx + 1}`,
        values
      );
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async deletePaymentVoucher(id: string, companyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const idValidation = validateInput(idCompanySchema, { id, companyId });
      if (!idValidation.success) return { success: false, error: idValidation.error };
      const adapter = await getDbAdapter();
      return await adapter.query(`DELETE FROM payment_vouchers WHERE id = $1 AND company_id = $2`, [id, companyId]);
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  async getTrialBalance(companyId: string, asOfDate?: string): Promise<{ success: boolean; data?: TrialBalanceRow[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();

      let sql = `
      SELECT
        a.id as account_id,
        a.code as account_code,
        a.name_ar as account_name,
        COALESCE(SUM(je.debit), 0) as debit,
        COALESCE(SUM(je.credit), 0) as credit,
        a.balance as balance
      FROM accounts a
      LEFT JOIN journal_entries je ON a.id = je.account_id
      LEFT JOIN transactions t ON je.transaction_id = t.id AND t.status = 'posted'
      WHERE a.company_id = $1 AND a.is_group = false
      `;
      const params: unknown[] = [companyId];
      if (asOfDate) {
        sql += ` AND t.date <= $${params.length + 1}`;
        params.push(asOfDate);
      }
      sql += ` GROUP BY a.id, a.code, a.name_ar, a.balance ORDER BY a.code`;

      const result = await adapter.query(sql, params);

      if (result.success && result.rows && result.rows.length > 0) {
        interface TrialRow {
          account_id: string;
          id: string;
          account_code: string;
          code: string;
          account_name: string;
          name_ar: string;
          debit: number;
          credit: number;
          balance: number;
        }
        const rows: TrialBalanceRow[] = (result.rows as TrialRow[]).map((r) => ({
          accountId: r.account_id || r.id,
          accountCode: r.account_code || r.code,
          accountName: r.account_name || r.name_ar,
          debit: Number(r.debit) || 0,
          credit: Number(r.credit) || 0,
          balance: Number(r.balance) || 0,
        }));
        return { success: true, data: rows };
      }

      const accountsResult = await adapter.getAccounts(companyId);
      if (accountsResult.success && accountsResult.data) {
        const rows: TrialBalanceRow[] = mapRows<Account>(accountsResult.data)
          .filter(a => !a.isGroup && a.balance !== 0)
          .map(a => ({ accountId: a.id, accountCode: a.code, accountName: a.nameAr, debit: a.balance > 0 ? a.balance : 0, credit: a.balance < 0 ? Math.abs(a.balance) : 0, balance: a.balance }));
        return { success: true, data: rows };
      }
      return { success: true, data: [] };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getBalanceSheet(companyId: string, asOfDate?: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `SELECT * FROM accounts WHERE company_id = $1 AND type IN ('asset', 'liability', 'equity') AND is_group = false`;
      const params: unknown[] = [companyId];
      if (asOfDate) {
        sql += ` AND EXISTS (SELECT 1 FROM journal_entries je JOIN transactions t ON je.transaction_id = t.id WHERE je.account_id = accounts.id AND t.status = 'posted' AND t.date <= $${params.length + 1})`;
        params.push(asOfDate);
      }
      sql += ` ORDER BY code`;
      const result = await adapter.query(sql, params);
      if (result.success && result.rows && result.rows.length > 0) {
        return { success: true, data: mapRows<Account>(result.rows).filter(a => ['asset', 'liability', 'equity'].includes(a.type)) };
      }
      const accResult = await adapter.getAccounts(companyId);
      if (accResult.success && accResult.data) {
        const rows = mapRows<Account>(accResult.data).filter(a => ['asset', 'liability', 'equity'].includes(a.type));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getProfitLoss(companyId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
    try {
      const cidValidation = validateInput(companyIdSchema, companyId);
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `SELECT * FROM accounts WHERE company_id = $1 AND type IN ('revenue', 'expense') AND is_group = false`;
      const params: unknown[] = [companyId];
      if (startDate && endDate) {
        sql += ` AND EXISTS (SELECT 1 FROM journal_entries je JOIN transactions t ON je.transaction_id = t.id WHERE je.account_id = accounts.id AND t.status = 'posted' AND t.date BETWEEN $${params.length + 1} AND $${params.length + 2})`;
        params.push(startDate, endDate);
      } else if (startDate) {
        sql += ` AND EXISTS (SELECT 1 FROM journal_entries je JOIN transactions t ON je.transaction_id = t.id WHERE je.account_id = accounts.id AND t.status = 'posted' AND t.date >= $${params.length + 1})`;
        params.push(startDate);
      } else if (endDate) {
        sql += ` AND EXISTS (SELECT 1 FROM journal_entries je JOIN transactions t ON je.transaction_id = t.id WHERE je.account_id = accounts.id AND t.status = 'posted' AND t.date <= $${params.length + 1})`;
        params.push(endDate);
      }
      sql += ` ORDER BY code`;
      const result = await adapter.query(sql, params);
      if (result.success && result.rows && result.rows.length > 0) {
        return { success: true, data: mapRows<Account>(result.rows).filter(a => ['revenue', 'expense'].includes(a.type)) };
      }
      const accResult = await adapter.getAccounts(companyId);
      if (accResult.success && accResult.data) {
        const rows = mapRows<Account>(accResult.data).filter(a => ['revenue', 'expense'].includes(a.type));
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },

  async getAccountLedger(accountId: string, companyId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: LedgerRow[]; error?: string }> {
    try {
      const cidValidation = validateInput(idCompanySchema, { companyId, id: accountId });
      if (!cidValidation.success) return { success: false, error: cidValidation.error };
      const adapter = await getDbAdapter();
      let sql = `
      SELECT
        t.id,
        t.date,
        t.reference,
        t.description,
        je.debit,
        je.credit
      FROM journal_entries je
      JOIN transactions t ON je.transaction_id = t.id
      WHERE je.account_id = $1 AND t.company_id = $2 AND t.status = 'posted'
      `;
      const params: unknown[] = [accountId, companyId];
      if (startDate) {
        sql += ` AND t.date >= $${params.length + 1}`;
        params.push(startDate);
      }
      if (endDate) {
        sql += ` AND t.date <= $${params.length + 1}`;
        params.push(endDate);
      }
      sql += ` ORDER BY t.date, t.created_at`;

      const result = await adapter.query(sql, params);
      if (result.success && result.rows) {
        interface LedgerQueryRow {
          id: string;
          date: string;
          reference: string;
          description: string;
          debit: number;
          credit: number;
        }
        let runningBalance = 0;
        const rows = (result.rows as LedgerQueryRow[]).map(row => {
          const debit = Number(row.debit) || 0;
          const credit = Number(row.credit) || 0;
          runningBalance += debit - credit;
          return {
            id: row.id,
            date: row.date,
            reference: row.reference,
            description: row.description,
            debit,
            credit,
            balance: runningBalance,
          } as LedgerRow;
        });
        return { success: true, data: rows };
      }
      return { success: false, error: result.error };
    } catch (e) {
      return { success: false, error: String(e) };
    }
  },
};
