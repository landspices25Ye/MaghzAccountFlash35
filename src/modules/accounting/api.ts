import { getDbAdapter } from '@/core/database/adapters';
import { mapRows } from '@/core/utils/mapPgRow';
import type { Account, Transaction, JournalEntry, TrialBalanceRow, LedgerRow, ReceiptVoucher, PaymentVoucher } from './types';

export const accountingApi = {
  // ─── Chart of Accounts ────────────────────────────────────────────────────
  async getAccounts(companyId: string, ownedByUserId?: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
    try {
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
      const checkResult = await adapter.query(
        `SELECT COUNT(*) as count FROM journal_entries WHERE account_id = $1`,
        [id]
      );
      const count = checkResult.rows?.[0]?.count || 0;
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
          sql: `INSERT INTO journal_entries (id, transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5, $6)`,
          params: [entry.id || crypto.randomUUID(), txId, entry.accountId, entry.debit, entry.credit, entry.memo]
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
        const deleteResult = await adapter.query(`DELETE FROM journal_entries WHERE transaction_id = $1`, [id]);
        if (!deleteResult.success) return deleteResult;

        for (const entry of data.entries) {
          const entryResult = await adapter.query(
            `INSERT INTO journal_entries (id, transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5, $6)`,
            [entry.id || crypto.randomUUID(), id, entry.accountId, entry.debit, entry.credit, entry.memo]
          );
          if (!entryResult.success) return entryResult;
        }
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

  async createReceiptVoucher(data: Omit<ReceiptVoucher, 'id'>, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createReceiptVoucherSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const id = crypto.randomUUID();
      const result = await adapter.query(
        `INSERT INTO receipt_vouchers (id, company_id, voucher_number, date, customer_id, amount, payment_method, bank_account_id, check_number, check_date, notes, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [id, data.companyId, data.voucherNumber, data.date, data.customerId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status, userId, userId]
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
      return await adapter.query(
        `UPDATE receipt_vouchers SET date = $1, customer_id = $2, amount = $3, payment_method = $4, bank_account_id = $5, check_number = $6, check_date = $7, notes = $8, status = $9, updated_at = NOW(), updated_by = $10 WHERE id = $11 AND company_id = $12`,
        [data.date, data.customerId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status, userId, id, companyId]
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

  async createPaymentVoucher(data: Omit<PaymentVoucher, 'id'>, userId: string): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const validation = validateInput(createPaymentVoucherSchema, data);
      if (!validation.success) return { success: false, error: validation.error };
      const adapter = await getDbAdapter();
      const id = crypto.randomUUID();
      const result = await adapter.query(
        `INSERT INTO payment_vouchers (id, company_id, voucher_number, date, supplier_id, expense_account_id, amount, payment_method, bank_account_id, check_number, check_date, notes, status, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
        [id, data.companyId, data.voucherNumber, data.date, data.supplierId, data.expenseAccountId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status, userId, userId]
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
      return await adapter.query(
        `UPDATE payment_vouchers SET date = $1, supplier_id = $2, expense_account_id = $3, amount = $4, payment_method = $5, bank_account_id = $6, check_number = $7, check_date = $8, notes = $9, status = $10, updated_at = NOW(), updated_by = $11 WHERE id = $12 AND company_id = $13`,
        [data.date, data.supplierId, data.expenseAccountId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status, userId, id, companyId]
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
