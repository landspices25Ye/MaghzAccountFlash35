import { getDbAdapter } from '@/core/database/adapters';
import type { Account, Transaction, TrialBalanceRow } from './types';

export const accountingApi = {
  // ─── Chart of Accounts ────────────────────────────────────────────────────
  async getAccounts(companyId: string): Promise<{ success: boolean; data?: Account[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getAccounts(companyId);
    
    if (result.success && result.data) {
      // Build tree structure
      const accounts = result.data as Account[];
      const accountMap = new Map<string, Account>();
      const rootAccounts: Account[] = [];
      
      // First pass: create map
      accounts.forEach(acc => {
        accountMap.set(acc.id, { ...acc, children: [] });
      });
      
      // Second pass: build tree
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
    // Use generic query for updates
    return adapter.query(
      `UPDATE accounts SET name_ar = $1, name_en = $2, code = $3, parent_id = $4, type = $5, nature = $6, is_group = $7, is_active = $8, updated_at = NOW() WHERE id = $9`,
      [data.nameAr, data.nameEn, data.code, data.parentId, data.type, data.nature, data.isGroup, data.isActive, id]
    );
  },

  // ─── Journal Entries ──────────────────────────────────────────────────────
  async getTransactions(companyId: string): Promise<{ success: boolean; data?: Transaction[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.getTransactions(companyId);
    return { success: result.success, data: result.data as Transaction[], error: result.error };
  },

  async createTransaction(data: Omit<Transaction, 'id'>): Promise<{ success: boolean; id?: string; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.createTransaction(data);
  },

  async postTransaction(id: string): Promise<{ success: boolean; error?: string }> {
    const adapter = await getDbAdapter();
    return adapter.query(
      `UPDATE transactions SET status = 'posted', updated_at = NOW() WHERE id = $1`,
      [id]
    );
  },

  // ─── Reports ──────────────────────────────────────────────────────────────
  async getTrialBalance(companyId: string, _asOfDate?: string): Promise<{ success: boolean; data?: TrialBalanceRow[]; error?: string }> {
    const adapter = await getDbAdapter();
    
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
      LEFT JOIN transactions t ON je.transaction_id = t.id AND t.status = 'posted'
      WHERE a.company_id = $1 AND a.is_group = false
      GROUP BY a.id, a.code, a.name_ar, a.balance ORDER BY a.code
    `;
    
    const result = await adapter.query(sql, [companyId]);
    
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: result.rows as TrialBalanceRow[] };
    }
    
    // Fallback: compute from accounts directly
    const accountsResult = await adapter.getAccounts(companyId);
    if (accountsResult.success && accountsResult.data) {
      const rows: TrialBalanceRow[] = (accountsResult.data as Account[])
        .filter(a => !a.isGroup && a.balance !== 0)
        .map(a => ({
          accountId: a.id,
          accountCode: a.code,
          accountName: a.nameAr,
          debit: a.nature === 'debit' && a.balance > 0 ? Math.abs(a.balance) : 0,
          credit: a.nature === 'credit' && a.balance > 0 ? Math.abs(a.balance) : (a.nature === 'debit' && a.balance < 0 ? Math.abs(a.balance) : 0),
          balance: a.balance,
        }));
      return { success: true, data: rows };
    }
    
    return { success: false, error: result.error };
  },

  async getBalanceSheet(companyId: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM accounts WHERE company_id = $1 AND type IN ('asset', 'liability', 'equity') AND is_group = false ORDER BY code`,
      [companyId]
    );
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: result.rows };
    }
    // Fallback
    const accResult = await adapter.getAccounts(companyId);
    if (accResult.success && accResult.data) {
      const rows = (accResult.data as Account[]).filter(a => ['asset', 'liability', 'equity'].includes(a.type));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },

  async getProfitLoss(companyId: string, _startDate?: string, _endDate?: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    const adapter = await getDbAdapter();
    const result = await adapter.query(
      `SELECT * FROM accounts WHERE company_id = $1 AND type IN ('revenue', 'expense') AND is_group = false ORDER BY code`,
      [companyId]
    );
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: result.rows };
    }
    // Fallback
    const accResult = await adapter.getAccounts(companyId);
    if (accResult.success && accResult.data) {
      const rows = (accResult.data as Account[]).filter(a => ['revenue', 'expense'].includes(a.type));
      return { success: true, data: rows };
    }
    return { success: false, error: result.error };
  },
};
