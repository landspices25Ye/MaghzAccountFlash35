/**
 * Database Client - Unified Interface
 * 
 * Detects the runtime environment and routes queries accordingly:
 * - In Electron: uses PostgreSQL via IPC (window.electronDB)
 * - In Web browser: falls back to Dexie.js IndexedDB (local-first)
 */

// Detect if running inside Electron
export const isElectron = (): boolean => {
  return typeof window !== 'undefined' && 
    typeof (window as any).electronDB !== 'undefined';
};

// ─── PostgreSQL via Electron IPC ─────────────────────────────────────────────

export interface QueryResult<T = Record<string, any>> {
  success: boolean;
  rows?: T[];
  rowCount?: number;
  error?: string;
}

/**
 * Execute a single SQL query against PostgreSQL (Electron only)
 */
export async function pgQuery<T = Record<string, any>>(
  sql: string, 
  params: any[] = []
): Promise<QueryResult<T>> {
  if (!isElectron()) {
    return { success: false, error: 'PostgreSQL not available in Web mode. Using IndexedDB.' };
  }
  return (window as any).electronDB.query(sql, params);
}

/**
 * Execute multiple queries in a ACID transaction (Electron only)
 */
export async function pgTransaction(
  queries: Array<{ sql: string; params?: any[] }>
): Promise<QueryResult> {
  if (!isElectron()) {
    return { success: false, error: 'Transactions require Electron/PostgreSQL.' };
  }
  return (window as any).electronDB.transaction(queries);
}

/**
 * Test PostgreSQL connection
 */
export async function pgPing(): Promise<{ success: boolean; db?: string; time?: string; error?: string }> {
  if (!isElectron()) {
    return { success: false, error: 'Not running in Electron.' };
  }
  return (window as any).electronDB.ping();
}

// ─── High-level Query Helpers ─────────────────────────────────────────────────

/**
 * Fetch all accounts from PostgreSQL for the given company
 */
export async function pgGetAccounts(companyId?: string): Promise<QueryResult> {
  if (companyId) {
    return pgQuery(
      `SELECT id, code, name_ar, name_en, parent_id, type, nature, is_group, balance
       FROM accounts WHERE company_id = $1 ORDER BY code`,
      [companyId]
    );
  }
  return pgQuery(
    `SELECT a.id, a.code, a.name_ar, a.name_en, a.parent_id, a.type, a.nature, a.is_group, a.balance, a.company_id
     FROM accounts a ORDER BY a.code`
  );
}

/**
 * Fetch recent activity logs from PostgreSQL
 */
export async function pgGetRecentLogs(limit = 5): Promise<QueryResult> {
  return pgQuery(
    `SELECT id, user_name, action, module, details, created_at 
     FROM activity_logs 
     ORDER BY created_at DESC 
     LIMIT $1`,
    [limit]
  );
}

/**
 * Fetch active company info
 */
export async function pgGetCompany(): Promise<QueryResult> {
  return pgQuery(
    `SELECT id, name, name_en, currency, tax_number, address, phone, email 
     FROM companies 
     ORDER BY created_at 
     LIMIT 1`
  );
}

/**
 * Update an account balance
 */
export async function pgUpdateAccountBalance(
  accountId: string, 
  newBalance: number
): Promise<QueryResult> {
  return pgQuery(
    `UPDATE accounts SET balance = $1, updated_at = NOW() WHERE id = $2 RETURNING id, balance`,
    [newBalance, accountId]
  );
}

/**
 * Add an activity log entry
 */
export async function pgAddLog(
  companyId: string,
  userName: string,
  action: string,
  module: string,
  details?: string
): Promise<QueryResult> {
  return pgQuery(
    `INSERT INTO activity_logs (company_id, user_name, action, module, details)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [companyId, userName, action, module, details || null]
  );
}

/**
 * Add a new account in PostgreSQL
 */
export async function pgAddAccount(payload: {
  companyId: string;
  code: string;
  nameAr: string;
  nameEn?: string;
  parentId?: string;
  type: string;
  nature: string;
  isGroup: boolean;
}): Promise<QueryResult> {
  return pgQuery(
    `INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0) RETURNING id`,
    [
      payload.companyId,
      payload.code,
      payload.nameAr,
      payload.nameEn || null,
      payload.parentId || null,
      payload.type,
      payload.nature,
      payload.isGroup
    ]
  );
}

/**
 * Get all transactions and journal entries in PostgreSQL
 */
export async function pgGetTransactions(companyId?: string): Promise<QueryResult> {
  if (companyId) {
    return pgQuery(
      `SELECT t.id, t.date, t.reference, t.description, t.total_amount as "totalAmount", t.status,
              COALESCE(json_agg(json_build_object(
                'id', je.id,
                'accountId', je.account_id,
                'debit', je.debit::float,
                'credit', je.credit::float,
                'memo', je.memo
              )) FILTER (WHERE je.id IS NOT NULL), '[]') as entries
       FROM transactions t
       LEFT JOIN journal_entries je ON je.transaction_id = t.id
       WHERE t.company_id = $1
       GROUP BY t.id
       ORDER BY t.date DESC, t.created_at DESC`,
      [companyId]
    );
  }
  return pgQuery(
    `SELECT t.id, t.date, t.reference, t.description, t.total_amount as "totalAmount", t.status,
            COALESCE(json_agg(json_build_object(
              'id', je.id,
              'accountId', je.account_id,
              'debit', je.debit::float,
              'credit', je.credit::float,
              'memo', je.memo
            )) FILTER (WHERE je.id IS NOT NULL), '[]') as entries
     FROM transactions t
     LEFT JOIN journal_entries je ON je.transaction_id = t.id
     GROUP BY t.id
     ORDER BY t.date DESC, t.created_at DESC`
  );
}

/**
 * Post an ACID double-entry transaction in PostgreSQL
 */
export async function pgPostTransaction(payload: {
  companyId: string;
  date: string;
  reference: string;
  description: string;
  totalAmount: number;
  entries: Array<{
    accountId: string;
    debit: number;
    credit: number;
    memo?: string;
  }>;
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const txId = crypto.randomUUID();
    const queries: Array<{ sql: string; params: any[] }> = [];

    // 1. Insert Transaction Header
    queries.push({
      sql: `INSERT INTO transactions (id, company_id, date, reference, description, total_amount, status)
            VALUES ($1, $2, $3, $4, $5, $6, 'posted')`,
      params: [
        txId,
        payload.companyId,
        payload.date,
        payload.reference || null,
        payload.description || null,
        payload.totalAmount,
      ]
    });

    // 2. Insert Journal Lines & Update Balances
    for (const entry of payload.entries) {
      const lineId = crypto.randomUUID();
      
      // Insert Journal Entry Line
      queries.push({
        sql: `INSERT INTO journal_entries (id, transaction_id, account_id, debit, credit, memo)
              VALUES ($1, $2, $3, $4, $5, $6)`,
        params: [
          lineId,
          txId,
          entry.accountId,
          entry.debit,
          entry.credit,
          entry.memo || null,
        ]
      });

      // Update Account Balance dynamically based on debit/credit nature
      queries.push({
        sql: `UPDATE accounts 
              SET balance = balance + (CASE WHEN nature = 'debit' THEN $1 - $2 ELSE $2 - $1 END), updated_at = NOW() 
              WHERE id = $3`,
        params: [
          entry.debit,
          entry.credit,
          entry.accountId,
        ]
      });
    }

    const txResult = await pgTransaction(queries);
    if (txResult.success) {
      return { success: true, id: txId };
    } else {
      return { success: false, error: txResult.error };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
