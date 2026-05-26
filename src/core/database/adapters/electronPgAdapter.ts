import type { DbAdapter } from './types';

// Use window.electronDB exposed by preload script
// This avoids importing 'electron' directly which breaks browser builds
function getDB() {
  if (typeof window !== 'undefined' && (window as any).electronDB) {
    return (window as any).electronDB;
  }
  throw new Error('electronDB not available');
}

// PostgreSQL numeric types are returned as strings by node-postgres.
// Auto-convert known numeric columns to actual JS numbers to avoid NaN / "ليس رقماً".
const NUMERIC_COLUMNS = new Set([
  'balance', 'debit', 'credit', 'total_amount', 'subtotal', 'vat_amount',
  'paid_amount', 'discount_amount', 'cost_price', 'sale_price', 'stock_qty',
  'min_stock_alert', 'unit_price', 'line_total', 'quantity', 'exchange_rate',
  'vat_rate', 'amount', 'base_salary', 'allowances', 'deductions', 'overtime',
  'net_salary', 'value', 'estimated_value', 'probability', 'duration',
  'estimated_cost', 'actual_cost', 'planned_cost', 'variance_cost', 'variance_qty',
  'unit_cost', 'stock_value', 'revenue', 'cost', 'profit', 'avg_value',
  'credit_limit', 'tax_rate', 'rate', 'starting_number', 'current_number',
  'increment_step', 'padding_length',
]);

function normalizeRow(row: Record<string, unknown>): Record<string, unknown> {
  if (!row || typeof row !== 'object') return row;
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    if (val === null || val === undefined) {
      out[key] = val;
    } else if (NUMERIC_COLUMNS.has(key)) {
      const n = Number(val);
      out[key] = isNaN(n) ? 0 : n;
    } else {
      out[key] = val;
    }
  }
  return out;
}

function normalizeResult(result: { success: boolean; rows?: Record<string, unknown>[]; error?: string }) {
  if (result.success && result.rows) {
    return { ...result, rows: result.rows.map(normalizeRow) };
  }
  return result;
}

/** Convert SQLite-style ? placeholders to PostgreSQL $1, $2... */
function convertPlaceholders(sql: string): string {
  let i = 1;
  return sql.replace(/\?/g, () => `$${i++}`);
}
// ensure-rebuild: v2

/**
 * Electron IPC Adapter (PostgreSQL via main process)
 * Used when running in Electron with PostgreSQL available
 */
export const electronPgAdapter: DbAdapter = {
  async ping() {
    return getDB().ping();
  },

  async query(sql, params) {
    const pgSql = convertPlaceholders(sql);
    const raw = await getDB().query(pgSql, params);
    const normalized = normalizeResult(raw);
    return normalized as any;
  },

  async transaction(queries) {
    const pgQueries = queries.map(q => ({
      sql: convertPlaceholders(q.sql),
      params: q.params,
    }));
    const raw = await getDB().transaction(pgQueries);
    return raw;
  },

  async getCompany() {
    const raw = await getDB().query('SELECT * FROM companies LIMIT 1');
    const result = normalizeResult(raw);
    if (result.success && result.rows && result.rows.length > 0) {
      return { success: true, data: result.rows[0] };
    }
    return { success: false, error: 'No company found' };
  },

  async getAccounts(companyId) {
    const result = await getDB().query(
      'SELECT * FROM accounts WHERE company_id = $1 ORDER BY code',
      [companyId],
    );
    return { success: result.success, data: result.rows, error: result.error };
  },

  async createAccount(data) {
    const result = await getDB().query(
      `INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [data.companyId, data.code, data.nameAr, data.nameEn, data.parentId, data.type, data.nature, data.isGroup, data.balance || 0],
    );
    if (result.success && result.rows?.length > 0) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async updateAccountBalance(accountId, delta) {
    const result = await getDB().query(
      'UPDATE accounts SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
      [delta, accountId],
    );
    return result;
  },

  async getTransactions(companyId) {
    // Fetch transactions and entries separately to avoid json_agg issues
    const txResult = await getDB().query(
      `SELECT * FROM transactions WHERE company_id = $1 ORDER BY date DESC`,
      [companyId],
    );
    if (!txResult.success) return { success: false, error: txResult.error };
    
    const transactions = normalizeResult(txResult).rows || [];
    if (transactions.length === 0) {
      return { success: true, data: [] };
    }
    
    const txIds = transactions.map((t: any) => t.id);
    const entriesResult = await getDB().query(
      `SELECT je.*, a.name_ar as account_name, a.code as account_code 
       FROM journal_entries je 
       LEFT JOIN accounts a ON je.account_id = a.id 
       WHERE je.transaction_id = ANY($1)`,
      [txIds],
    );
    
    const allEntries = normalizeResult(entriesResult).rows || [];
    const entriesByTx = new Map<string, any[]>();
    for (const entry of allEntries) {
      const txId = String(entry.transaction_id || entry.transactionId);
      if (!entriesByTx.has(txId)) entriesByTx.set(txId, []);
      entriesByTx.get(txId)!.push(entry);
    }
    
    for (const tx of transactions) {
      const txId = String(tx.id);
      const txEntries = entriesByTx.get(txId) || [];
      tx.entries = txEntries.map((row: any) => ({
        id: row.id,
        transactionId: row.transaction_id || row.transactionId,
        accountId: row.account_id || row.accountId,
        account: row.account_name ? { 
          id: row.account_id || row.accountId, 
          nameAr: row.account_name || row.accountName, 
          code: row.account_code || row.accountCode 
        } : undefined,
        debit: Number(row.debit) || 0,
        credit: Number(row.credit) || 0,
        memo: row.memo,
      }));
    }
    
    return { success: true, data: transactions };
  },

  async createTransaction(data) {
    const txResult = await getDB().transaction([
      { sql: `INSERT INTO transactions (company_id, date, reference, description, total_amount, status)
              VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        params: [data.companyId, data.date, data.reference, data.description, data.totalAmount, data.status || 'posted'] },
    ]);

    if (txResult.success && txResult.results?.[0]?.[0]) {
      const txId = txResult.results[0][0].id;

      // Insert journal entries
      for (const entry of data.entries) {
        await getDB().query(
          `INSERT INTO journal_entries (transaction_id, account_id, debit, credit, memo)
           VALUES ($1, $2, $3, $4, $5)`,
          [txId, entry.accountId, entry.debit, entry.credit, entry.memo],
        );
      }

      return { success: true, id: txId };
    }
    return { success: false, error: txResult.error };
  },

  async getProducts(companyId) {
    const result = await getDB().query(
      'SELECT * FROM products WHERE company_id = $1 ORDER BY name_ar',
      [companyId],
    );
    return { success: result.success, data: result.rows, error: result.error };
  },

  async createProduct(data) {
    const result = await getDB().query(
      `INSERT INTO products (company_id, code, name_ar, name_en, barcode, sku, unit, cost_price, sale_price, stock_qty, min_stock_alert)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [data.companyId, data.code, data.nameAr, data.nameEn, data.barcode, data.sku, data.unit, data.costPrice, data.salePrice, data.stockQty, data.minStockAlert],
    );
    if (result.success && result.rows?.length > 0) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },

  async getContacts(companyId, type) {
    let sql = 'SELECT * FROM contacts WHERE company_id = $1';
    const params: unknown[] = [companyId];
    if (type) {
      sql += ' AND type = $2';
      params.push(type);
    }
    sql += ' ORDER BY name';

    const result = await getDB().query(sql, params);
    return { success: result.success, data: result.rows, error: result.error };
  },

  async createContact(data) {
    const result = await getDB().query(
      `INSERT INTO contacts (company_id, type, name, phone, email, address, tax_number, balance)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [data.companyId, data.type, data.name, data.phone, data.email, data.address, data.taxNumber, data.balance || 0],
    );
    if (result.success && result.rows?.length > 0) {
      return { success: true, id: result.rows[0].id };
    }
    return { success: false, error: result.error };
  },
};
