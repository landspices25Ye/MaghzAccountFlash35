import { getDbAdapter } from '@/core/database/adapters';
import { mapRows } from '@/core/utils/mapPgRow';
import type { Account, Transaction, TrialBalanceRow, LedgerRow, ReceiptVoucher, PaymentVoucher } from './types';

export const accountingApi = {
  // ─── Chart of Accounts ────────────────────────────────────────────────────
  async getAccounts(companyId: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getAccounts(companyId);
    
    if (result.success && result.data) {
      const accounts = mapRows<Account>(result.data);
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
  },

  async createAccount(data: Omit<Account, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.createAccount(data);
  },

  async updateAccount(id: string, data: Partial<Account>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE accounts SET name_ar = $1, name_en = $2, code = $3, parent_id = $4, type = $5, nature = $6, is_group = $7, is_active = $8, updated_at = NOW() WHERE id = $9`,
      [data.nameAr, data.nameEn, data.code, data.parentId, data.type, data.nature, data.isGroup, data.isActive, id]
    );
  },

  async deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    // Check if account has journal entries
    const checkResult = await adapter.query(
      `SELECT COUNT(*) as count FROM journal_entries WHERE account_id = $1`,
      [id]
    );
    const count = checkResult.rows?.[0]?.count || 0;
    if (count > 0) {
      return { success: false, error: 'لا يمكن حذف حساب له قيود يومية' };
    }
    return adapter.query(`DELETE FROM accounts WHERE id = $1`, [id]);
  },

  async getAccountById(id: string): Promise<{ success: boolean; data?: Account; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM accounts WHERE id = $1`,
      [id]
    );
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: mapRows<Account>([result.rows[0]])[0] };
    }
    return { success: false, error: 'Account not found' };
  },

  // ─── Journal Entries ──────────────────────────────────────────────────────
  async getTransactions(companyId: string): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getTransactions(companyId);
    return { success: result.success, data: mapRows<Transaction>(result.data), error: result.error };
  },

  async getTransactionById(id: string): Promise<{ success: boolean; data?: Transaction; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM transactions WHERE id = $1`,
      [id]
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
      tx.entries = (entriesResult.rows || []).map((row: any) => ({
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
  },

  async createTransaction(data: Omit<Transaction, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.createTransaction(data);
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    const txResult = await adapter.query(
      `UPDATE transactions SET date = $1, reference = $2, description = $3, total_amount = $4, status = $5, updated_at = NOW() WHERE id = $6`,
      [data.date, data.reference, data.description, data.totalAmount, data.status, id]
    );
    if (!txResult.success) return txResult;
    
    // Update entries if provided
    if (data.entries && data.entries.length > 0) {
      await adapter.query(`DELETE FROM journal_entries WHERE transaction_id = $1`, [id]);
      for (const entry of data.entries) {
        await adapter.query(
          `INSERT INTO journal_entries (id, transaction_id, account_id, debit, credit, memo) VALUES ($1, $2, $3, $4, $5, $6)`,
          [entry.id || crypto.randomUUID(), id, entry.accountId, entry.debit, entry.credit, entry.memo]
        );
      }
    }
    return { success: true };
  },

  async postTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE transactions SET status = 'posted', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  async deleteTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    await adapter.query(`DELETE FROM journal_entries WHERE transaction_id = $1`, [id]);
    return adapter.query(`DELETE FROM transactions WHERE id = $1`, [id]);
  },

  // ─── Receipt Vouchers ─────────────────────────────────────────────────────
  async getReceiptVouchers(companyId: string): Promise<{ success: boolean; data?: ReceiptVoucher[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT rv.*, c.name_ar as customer_name 
       FROM receipt_vouchers rv 
       LEFT JOIN contacts c ON rv.customer_id = c.id 
       WHERE rv.company_id = $1 ORDER BY rv.date DESC`,
      [companyId]
    );
    if (result.success && result.rows) {
      return { success: true, data: mapRows<ReceiptVoucher>(result.rows) };
    }
    return { success: false, error: result.error };
  },

  async createReceiptVoucher(data: Omit<ReceiptVoucher, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const id = crypto.randomUUID();
    const result = await adapter.query(
      `INSERT INTO receipt_vouchers (id, company_id, voucher_number, date, customer_id, amount, payment_method, bank_account_id, check_number, check_date, notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, data.companyId, data.voucherNumber, data.date, data.customerId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status]
    );
    if (result.success) return { success: true, id };
    return { success: false, error: result.error };
  },

  async updateReceiptVoucher(id: string, data: Partial<ReceiptVoucher>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE receipt_vouchers SET date = $1, customer_id = $2, amount = $3, payment_method = $4, bank_account_id = $5, check_number = $6, check_date = $7, notes = $8, status = $9, updated_at = NOW() WHERE id = $10`,
      [data.date, data.customerId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status, id]
    );
  },

  async deleteReceiptVoucher(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(`DELETE FROM receipt_vouchers WHERE id = $1`, [id]);
  },

  // ─── Payment Vouchers ─────────────────────────────────────────────────────
  async getPaymentVouchers(companyId: string): Promise<{ success: boolean; data?: PaymentVoucher[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT pv.*, c.name_ar as supplier_name, a.name_ar as expense_account_name 
       FROM payment_vouchers pv 
       LEFT JOIN contacts c ON pv.supplier_id = c.id 
       LEFT JOIN accounts a ON pv.expense_account_id = a.id 
       WHERE pv.company_id = $1 ORDER BY pv.date DESC`,
      [companyId]
    );
    if (result.success && result.rows) {
      return { success: true, data: mapRows<PaymentVoucher>(result.rows) };
    }
    return { success: false, error: result.error };
  },

  async createPaymentVoucher(data: Omit<PaymentVoucher, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    const id = crypto.randomUUID();
    const result = await adapter.query(
      `INSERT INTO payment_vouchers (id, company_id, voucher_number, date, supplier_id, expense_account_id, amount, payment_method, bank_account_id, check_number, check_date, notes, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [id, data.companyId, data.voucherNumber, data.date, data.supplierId, data.expenseAccountId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status]
    );
    if (result.success) return { success: true, id };
    return { success: false, error: result.error };
  },

  async updatePaymentVoucher(id: string, data: Partial<PaymentVoucher>): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE payment_vouchers SET date = $1, supplier_id = $2, expense_account_id = $3, amount = $4, payment_method = $5, bank_account_id = $6, check_number = $7, check_date = $8, notes = $9, status = $10, updated_at = NOW() WHERE id = $11`,
      [data.date, data.supplierId, data.expenseAccountId, data.amount, data.paymentMethod, data.bankAccountId, data.checkNumber, data.checkDate, data.notes, data.status, id]
    );
  },

  async deletePaymentVoucher(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(`DELETE FROM payment_vouchers WHERE id = $1`, [id]);
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  async getTrialBalance(companyId: string, asOfDate?: string): Promise<{ success: boolean; data?: TrialBalanceRow[]; error?: string }> {
    const adapter = await getDbAdapter();
    
    const dateFilter = asOfDate ? `AND t.date <= '${asOfDate}'` : '';
    const sql = `
      SELECT 
        a.id as account_id,
        a.code as account_code,
        a.name_ar as account_name,
        COALESCE(SUM(je.debit), 0) as debit,
        COALESCE(SUM(je.credit), 0) as credit,
        a.balance as balance
      FROM accounts a
      LEFT JOIN journal_entries je ON a.id = je.account_id
      LEFT JOIN transactions t ON je.transaction_id = t.id AND t.status = 'posted' ${dateFilter}
      WHERE a.company_id = $1 AND a.is_group = false
      GROUP BY a.id, a.code, a.name_ar, a.balance ORDER BY a.code
    `;
    
    const result = await adapter.query(sql, [companyId]);
    
    if (result.success && result.rows && result.rows.length > 0) {
      const rows: TrialBalanceRow[] = result.rows.map((r: any) => ({
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
  },

  async getBalanceSheet(companyId: string, asOfDate?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const adapter = await getDbAdapter();
    const dateFilter = asOfDate ? `AND date <= '${asOfDate}'` : '';
    const result = await adapter.query(
      `SELECT * FROM accounts WHERE company_id = $1 AND type IN ('asset', 'liability', 'equity') AND is_group = false ${dateFilter ? `AND EXISTS (SELECT 1 FROM journal_entries je JOIN transactions t ON je.transaction_id = t.id WHERE je.account_id = accounts.id AND t.status = 'posted' ${dateFilter})` : ''} ORDER BY code`,
      [companyId]
    );
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: mapRows<Account>(result.rows).filter(a => ['asset', 'liability', 'equity'].includes(a.type)) };
    }
    const accResult = await adapter.getAccounts(companyId);
    if (accResult.success && accResult.data) {
      const rows = mapRows<Account>(accResult.data).filter(a => ['asset', 'liability', 'equity'].includes(a.type));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async getProfitLoss(companyId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const adapter = await getDbAdapter();
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = `AND date BETWEEN '${startDate}' AND '${endDate}'`;
    } else if (startDate) {
      dateFilter = `AND date >= '${startDate}'`;
    } else if (endDate) {
      dateFilter = `AND date <= '${endDate}'`;
    }
    const result = await adapter.query(
      `SELECT * FROM accounts WHERE company_id = $1 AND type IN ('revenue', 'expense') AND is_group = false ${dateFilter ? `AND EXISTS (SELECT 1 FROM journal_entries je JOIN transactions t ON je.transaction_id = t.id WHERE je.account_id = accounts.id AND t.status = 'posted' ${dateFilter})` : ''} ORDER BY code`,
      [companyId]
    );
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: mapRows<Account>(result.rows).filter(a => ['revenue', 'expense'].includes(a.type)) };
    }
    const accResult = await adapter.getAccounts(companyId);
    if (accResult.success && accResult.data) {
      const rows = mapRows<Account>(accResult.data).filter(a => ['revenue', 'expense'].includes(a.type));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async getAccountLedger(accountId: string, companyId: string, startDate?: string, endDate?: string): Promise<{ success: boolean; data?: LedgerRow[]; error?: string }> {
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
    const params: any[] = [accountId, companyId];
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
      let runningBalance = 0;
      const rows = (result.rows as any[]).map(row => {
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
  },
};
