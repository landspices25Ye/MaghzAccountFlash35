import type { DbAdapter } from './types';

// Use window.electronDB exposed by preload script
// This avoids importing 'electron' directly which breaks browser builds
function getDB() {
  if (typeof window !== 'undefined' && (window as any).electronDB) {
    return (window as any).electronDB;
  }
  throw new Error('electronDB not available');
}

/**
 * Electron IPC Adapter (PostgreSQL via main process)
 * Used when running in Electron with PostgreSQL available
 */
export const electronPgAdapter: DbAdapter = {
  async ping() {
    return getDB().ping();
  },

  async query(sql, params) {
    return getDB().query(sql, params);
  },

  async transaction(queries) {
    return getDB().transaction(queries);
  },

  async getCompany() {
    const result = await getDB().query(
      'SELECT * FROM companies LIMIT 1',
    );
    if (result.success && result.rows?.length > 0) {
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
    const result = await getDB().query(
      `SELECT t.*, json_agg(je.*) as entries
       FROM transactions t
       LEFT JOIN journal_entries je ON t.id = je.transaction_id
       WHERE t.company_id = $1
       GROUP BY t.id
       ORDER BY t.date DESC`,
      [companyId],
    );
    return { success: result.success, data: result.rows, error: result.error };
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
