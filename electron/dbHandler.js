import { ipcMain } from 'electron';
import pg from 'pg';
import { randomBytes, pbkdf2Sync } from 'crypto';
import { seedComprehensiveDemoData } from './seedDemoData.js';

const SALT_LENGTH = 32;
const PBKDF2_ITERATIONS = 100000;
function hashPasswordNode(password) {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hash = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, 'sha256').toString('hex');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${salt}:${hash}`;
}

const { Pool } = pg;

let pool = null;
let querySeq = 0;

/**
 * Unique counter to tag each SQL query.
 * Adding a unique comment forces node-postgres to always send a fresh Parse
 * message, preventing the "inconsistent types deduced for parameter $N" error
 * that occurs when the same SQL text is reused with different param types.
 */
async function execQuery(target, sql, params) {
  const p = params || [];
  if (p.length > 0) {
    const taggedSql = `/*_q${querySeq++}_*/${sql}`;
    return await target.query(taggedSql, p);
  }
  return await target.query(sql);
}

/**
 * Wrap a pg Client to tag all parameterized queries with a unique comment,
 * preventing type inference conflicts from node-postgres statement caching.
 */
function wrapClient(client) {
  const origQuery = client.query.bind(client);
  client.query = (sql, params) => {
    if (params && params.length > 0) {
      return origQuery(`/*_q${querySeq++}_*/${sql}`, params);
    }
    return origQuery(sql, params);
  };
  return client;
}

function getRequiredEnv(key) {
  const val = process.env[key];
  if (!val) {
    throw new Error(`ظ…طھط؛ظٹط± ط§ظ„ط¨ظٹط¦ط© ${key} ط؛ظٹط± ظ…ط­ط¯ط¯. طھط£ظƒط¯ ظ…ظ† ظ…ظ„ظپ .env.local`);
  }
  return val;
}

// Create database connection pool
function createPool() {
  pool = new Pool({
    host: getRequiredEnv('DB_HOST'),
    port: parseInt(getRequiredEnv('DB_PORT')),
    database: getRequiredEnv('DB_NAME'),
    user: getRequiredEnv('DB_USER'),
    password: getRequiredEnv('DB_PASSWORD'),
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });

  return pool;
}

// Initialize IPC handlers for DB operations
export function registerDatabaseHandlers() {
  if (!pool) createPool();

  // Test connection
  ipcMain.handle('db:ping', async () => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as time, current_database() as db');
      client.release();
      return { success: true, time: result.rows[0].time, db: result.rows[0].db };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  const FORBIDDEN_SQL_PATTERNS = [
    /\bDROP\b/i,
    /\bALTER\b/i,
    /\bTRUNCATE\b/i,
    /\bGRANT\b/i,
    /\bREVOKE\b/i,
    /\bCREATE\b\s+(?:TABLE|INDEX|DATABASE|USER|ROLE|FUNCTION|PROCEDURE|TRIGGER|VIEW)\b/i,
    /\bINSERT\b\s+INTO\s+(?:pg_|information_schema)\./i,
    /\bDELETE\b\s+FROM\s+(?:pg_|information_schema)\./i,
  ];

  function isSqlAllowed(sql) {
    const trimmed = (sql || '').trim();
    if (!trimmed) return false;
    for (const pattern of FORBIDDEN_SQL_PATTERNS) {
      if (pattern.test(trimmed)) return false;
    }
    return true;
  }

  // Internal query handler (only accessible via _exec in preload, not exposed publicly)
  ipcMain.handle('db:internal-query', async (_event, { sql, params }) => {
    try {
      if (!isSqlAllowed(sql)) {
        return { success: false, error: 'SQL operation not permitted' };
      }
      const result = await execQuery(pool, sql, params);
      return { success: true, rows: result.rows, rowCount: result.rowCount };
    } catch (err) {
      console.error('[DB] Query error:', err.message, '\nSQL:', sql, '\nParams:', JSON.stringify(params));
      return { success: false, error: err.message };
    }
  });

  // Internal transaction handler (array of { sql, params })
  ipcMain.handle('db:internal-transaction', async (_event, queries) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const { sql, params } of queries) {
        if (!isSqlAllowed(sql)) {
          await client.query('ROLLBACK');
          return { success: false, error: 'SQL operation not permitted in transaction' };
        }
        const res = await execQuery(client, sql, params);
        results.push({ rows: res.rows, rowCount: res.rowCount });
      }
      await client.query('COMMIT');
      return { success: true, results };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[DB] Transaction error:', err.message);
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  });

  console.log('[DB] PostgreSQL IPC handlers registered.');
}

/* initializeSchema removed — schema is managed exclusively by Drizzle migrations (drizzle/*.sql). */

// Seed initial data
export async function seedInitialData() {
  if (!pool) createPool();

  // Check if already seeded
  const check = await pool.query("SELECT COUNT(*) FROM companies");
  if (parseInt(check.rows[0].count) > 0) {
    console.log('[DB] Data already seeded, skipping.');
    const existing = await pool.query('SELECT id FROM companies LIMIT 1');
    return existing.rows[0]?.id;
  }

  console.log('[DB] Seeding initial data...');
  const client = wrapClient(await pool.connect());
  try {
    await client.query('BEGIN');
    await client.query('DEALLOCATE ALL');

    // 1. Seed company with YER currency
    const companyResult = await client.query(`
      INSERT INTO companies (name, name_en, currency, tax_number, address, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `, [
      'ط´ط±ظƒط© ط§ظ„ظ…ط؛ط² ط§ظ„طھط¬ط§ط±ظٹط© ط§ظ„ظ…ط­ط¯ظˆط¯ط©',
      'Maghz Trading Company Ltd.',
      'YER',
      '100123456789',
      'طµظ†ط¹ط§ط،طŒ ط§ظ„ط¬ظ…ظ‡ظˆط±ظٹط© ط§ظ„ظٹظ…ظ†ظٹط©',
      '+967712345678',
      'info@maghz-erp.com'
    ]);

    const companyId = companyResult.rows[0].id;

    // 2. Seed admin user
    const adminPasswordHash = hashPasswordNode('admin123');
    const userResult = await client.query(`
      INSERT INTO users (company_id, username, email, full_name, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `, [companyId, 'ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ…', 'admin@maghz-erp.com', 'ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ…', 'admin', adminPasswordHash]);

    const adminId = userResult.rows[0].id;

    // 2a. Seed default admin role
    await client.query(`
      INSERT INTO roles (company_id, name, description, permissions, is_system)
      SELECT $1, 'ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ…', 'ظ…ط¯ظٹط± ط§ظ„ظ†ط¸ط§ظ… - طµظ„ط§ط­ظٹط§طھ ظƒط§ظ…ظ„ط©', '["all"]', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.company_id = $1 AND roles.is_system = TRUE);
    `, [companyId]);

    // 3. Seed Chart of Accounts

    // Assets
    const assetsRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '1', 'ط§ظ„ط£طµظˆظ„', 'Assets', 'asset', 'debit', TRUE) RETURNING id;
    `, [companyId]);
    const assetsId = assetsRes.rows[0].id;

    const curAssetsRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group)
      VALUES ($1, '11', 'ط§ظ„ط£طµظˆظ„ ط§ظ„ظ…طھط¯ط§ظˆظ„ط©', 'Current Assets', $2, 'asset', 'debit', TRUE) RETURNING id;
    `, [companyId, assetsId]);
    const curAssetsId = curAssetsRes.rows[0].id;

    const cashGroupRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group)
      VALUES ($1, '111', 'ط§ظ„طµظ†ط¯ظˆظ‚ ظˆط§ظ„ط¨ظ†ظˆظƒ', 'Cash & Banks', $2, 'asset', 'debit', TRUE) RETURNING id;
    `, [companyId, curAssetsId]);
    const cashGroupId = cashGroupRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11101', 'ط§ظ„طµظ†ط¯ظˆظ‚ ط§ظ„ط±ط¦ظٹط³ظٹ', 'Main Cash', $2, 'asset', 'debit', FALSE, 5000000);
    `, [companyId, cashGroupId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11102', 'ط­ط³ط§ط¨ ط¨ظ†ظƒ ط§ظ„ظƒط±ظٹظ…ظٹ', 'Yemen International Bank', $2, 'asset', 'debit', FALSE, 12000000);
    `, [companyId, cashGroupId]);

    // Liabilities
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '2', 'ط§ظ„ط§ظ„طھط²ط§ظ…ط§طھ', 'Liabilities', 'liability', 'credit', TRUE);
    `, [companyId]);

    // Equity
    const equityRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '3', 'ط­ظ‚ظˆظ‚ ط§ظ„ظ…ظ„ظƒظٹط©', 'Equity', 'equity', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const equityId = equityRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '31101', 'ط±ط£ط³ ط§ظ„ظ…ط§ظ„ ط§ظ„ظ…ط¯ظپظˆط¹', 'Paid-in Capital', $2, 'equity', 'credit', FALSE, 20000000);
    `, [companyId, equityId]);

    // Revenues
    const revenueRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '4', 'ط§ظ„ط¥ظٹط±ط§ط¯ط§طھ', 'Revenues', 'revenue', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const revenueId = revenueRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '41101', 'ظ…ط¨ظٹط¹ط§طھ ط§ظ„ظ…ظ†طھط¬ط§طھ', 'Product Sales', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    // Expenses
    const expenseRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '5', 'ط§ظ„ظ…طµط±ظˆظپط§طھ', 'Expenses', 'expense', 'debit', TRUE) RETURNING id;
    `, [companyId]);
    const expenseId = expenseRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '52201', 'ظ…طµط±ظˆظپط§طھ ط§ظ„ط¥ظٹط¬ط§ط±', 'Rent Expense', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '52101', 'ط±ظˆط§طھط¨ ط§ظ„ظ…ظˆط¸ظپظٹظ†', 'Employee Salaries', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    // Trade Debtors
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11201', 'ط§ظ„ظ…ط¯ظٹظ†ظˆظ† ط§ظ„طھط¬ط§ط±ظٹظˆظ†', 'Trade Customers', $2, 'asset', 'debit', FALSE, 0);
    `, [companyId, curAssetsId]);

    // Inventory
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11301', 'ط¨ط¶ط§ط¹ط© ط£ظˆظ„ ط§ظ„ظ…ط¯ط©', 'Opening Inventory', $2, 'asset', 'debit', FALSE, 0);
    `, [companyId, curAssetsId]);

    // Liabilities sub-accounts
    const liabRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '2', 'ط§ظ„ط§ظ„طھط²ط§ظ…ط§طھ', 'Liabilities', 'liability', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const liabId = liabRes.rows[0].id;

    // Trade Creditors
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '21101', 'ط§ظ„ط¯ط§ط¦ظ†ظˆظ† ط§ظ„طھط¬ط§ط±ظٹظˆظ†', 'Trade Suppliers', $2, 'liability', 'credit', FALSE, 0);
    `, [companyId, liabId]);

    // VAT Payable
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '21301', 'ط¶ط±ظٹط¨ط© ط§ظ„ظ‚ظٹظ…ط© ط§ظ„ظ…ط¶ط§ظپط©', 'VAT Payable', $2, 'liability', 'credit', FALSE, 0);
    `, [companyId, liabId]);

    // Additional revenue accounts
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '41102', 'ظ…ط¨ظٹط¹ط§طھ ط§ظ„ط®ط¯ظ…ط§طھ', 'Services Sales', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '41103', 'ظ…ط±ط¯ظˆط¯ط§طھ ط§ظ„ظ…ط¨ظٹط¹ط§طھ', 'Sales Returns', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    // COGS
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '51101', 'طھظƒظ„ظپط© ط¨ط¶ط§ط¹ط© ظ…ط¨ط§ط¹ط©', 'Cost of Goods Sold', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    // 4. Seed basic settings
    await client.query(`
      INSERT INTO vat_settings (company_id, vat_rate, vat_number, is_inclusive, is_active)
      VALUES ($1, 15, '3100123456', false, true) ON CONFLICT DO NOTHING;
    `, [companyId]);

    await client.query(`
      INSERT INTO currencies (company_id, code, name, symbol, exchange_rate, is_default, is_active)
      VALUES ($1, 'YER', 'ط§ظ„ط±ظٹط§ظ„ ط§ظ„ظٹظ…ظ†ظٹ', 'ط±.ظٹ', 1, true, true) ON CONFLICT DO NOTHING;
    `, [companyId]);

    await client.query(`
      INSERT INTO branches (company_id, name, code, address, is_active)
      VALUES ($1, 'ط§ظ„ظپط±ط¹ ط§ظ„ط±ط¦ظٹط³ظٹ', 'HQ', 'طµظ†ط¹ط§ط، - ط´ط§ط±ط¹ ط§ظ„ط³طھظٹظ†', true) ON CONFLICT DO NOTHING;
    `, [companyId]);

    // 5. Seed document sequences
    const docSeqs = [
      { type: 'sales_invoice', prefix: 'INV-', start: 1, current: 1 },
      { type: 'quotation', prefix: 'QOT-', start: 1, current: 1 },
      { type: 'purchase_order', prefix: 'PO-', start: 1, current: 1 },
      { type: 'purchase_invoice', prefix: 'PINV-', start: 1, current: 1 },
      { type: 'journal_voucher', prefix: 'JV-', start: 1, current: 1 },
      { type: 'receipt_voucher', prefix: 'RV-', start: 1, current: 1 },
      { type: 'payment_voucher', prefix: 'PV-', start: 1, current: 1 },
    ];
    for (const s of docSeqs) {
      await client.query(`
        INSERT INTO document_sequences (company_id, document_type, prefix, suffix, starting_number, current_number, increment_step, padding_length, year_reset, is_active)
        VALUES ($1, $2, $3, '', $4, $5, 1, 4, false, true) ON CONFLICT DO NOTHING;
      `, [companyId, s.type, s.prefix, s.start, s.current]);
    }

    // 5-extra. Additional document sequences
    const additionalDocSeqs = [
      { type: 'sales_return', prefix: 'SR-', start: 1, current: 1 },
      { type: 'purchase_return', prefix: 'PR-', start: 1, current: 1 },
      { type: 'work_order', prefix: 'WO-', start: 1, current: 1 },
      { type: 'stock_adjustment', prefix: 'ADJ-', start: 1, current: 1 },
      { type: 'inventory_transfer', prefix: 'TRF-', start: 1, current: 1 },
      { type: 'payroll_run', prefix: 'PAY-', start: 1, current: 1 },
    ];
    for (const s of additionalDocSeqs) {
      await client.query(`
        INSERT INTO document_sequences (company_id, document_type, prefix, suffix, starting_number, current_number, increment_step, padding_length, year_reset, is_active)
        SELECT $1, $2, $3, '', $4, $5, 1, 6, FALSE, TRUE
        WHERE NOT EXISTS (SELECT 1 FROM document_sequences WHERE company_id = $1 AND document_type = $2);
      `, [companyId, s.type, s.prefix, s.start, s.current]);
    }

    // 5a. Seed default accounts
    const defaultAccountMappings = [
      { key: 'default_cash', code: '11101' },
      { key: 'default_bank', code: '11102' },
      { key: 'default_sales', code: '41101' },
      { key: 'default_cogs', code: '51101' },
      { key: 'default_inventory', code: '11301' },
      { key: 'default_debtors', code: '11201' },
      { key: 'default_creditors', code: '21101' },
      { key: 'default_vat_output', code: '21301' },
      { key: 'default_vat_input', code: '21301' },
      { key: 'default_salaries', code: '52101' },
      { key: 'default_sales_returns', code: '41103' },
    ];
    for (const mapping of defaultAccountMappings) {
      const accRes = await client.query(
        `SELECT id FROM accounts WHERE company_id = $1 AND code = $2 LIMIT 1;`,
        [companyId, mapping.code]
      );
      if (accRes.rows.length > 0) {
        await client.query(`
          INSERT INTO default_accounts (company_id, function_key, account_id, is_required, description)
          VALUES ($1, $2, $3, true, '') ON CONFLICT DO NOTHING;
        `, [companyId, mapping.key, accRes.rows[0].id]);
      }
    }

    // 5a-extra. Additional default accounts
    const additionalDefaultAccounts = [
      { key: 'default_discount_allowed', code: '41101', required: false },
      { key: 'default_discount_received', code: '21101', required: false },
      { key: 'default_purchase_returns', code: '21101', required: true },
    ];
    for (const mapping of additionalDefaultAccounts) {
      const accRes = await client.query(
        `SELECT id FROM accounts WHERE company_id = $1 AND code = $2 LIMIT 1;`,
        [companyId, mapping.code]
      );
      if (accRes.rows.length > 0) {
        await client.query(`
          INSERT INTO default_accounts (company_id, function_key, account_id, is_required)
          SELECT $1, $2, $3, $4
          WHERE NOT EXISTS (SELECT 1 FROM default_accounts WHERE company_id = $1 AND function_key = $2);
        `, [companyId, mapping.key, accRes.rows[0].id, mapping.required]);
      }
    }

    // 5b. Seed product types
    await client.query(`
      INSERT INTO product_types (company_id, name_ar, name_en, code, appears_in_sales, appears_in_purchases, appears_in_inventory, has_stock_tracking)
      VALUES ($1, $2, $3, $4, true, true, true, true) ON CONFLICT DO NOTHING;
    `, [companyId, 'ط³ظ„ط¹ط© طھط¬ط§ط±ظٹط©', 'Trading Goods', 'TRADE']);

    // 5c. Seed units
    await client.query(`
      INSERT INTO units (company_id, name_ar, name_en, code, conversion_factor)
      VALUES ($1, $2, $3, $4, 1) ON CONFLICT DO NOTHING;
    `, [companyId, 'ظ‚ط·ط¹ط©', 'Piece', 'PC']);

    // 5d. Seed cash boxes
    const cashBoxAccRes = await client.query(
      `SELECT id FROM accounts WHERE company_id = $1 AND code = $2 LIMIT 1;`,
      [companyId, '11101']
    );
    if (cashBoxAccRes.rows.length > 0) {
      await client.query(`
        INSERT INTO cash_boxes (company_id, name, code, current_balance, account_id)
        VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;
      `, [companyId, 'ط§ظ„طµظ†ط¯ظˆظ‚ ط§ظ„ط±ط¦ظٹط³ظٹ', 'MAIN-CB', 5000000, cashBoxAccRes.rows[0].id]);

      await client.query(`
        INSERT INTO cash_boxes (company_id, name, code, current_balance, account_id)
        SELECT $1, $2, $3, $4, $5
        WHERE NOT EXISTS (SELECT 1 FROM cash_boxes WHERE company_id = $1 AND code = $3);
      `, [companyId, 'طµظ†ط¯ظˆظ‚ ظپط±ط¹ ط§ظ„ط­ط¯ظٹط¯ط©', 'CB-HOD', 200000, cashBoxAccRes.rows[0].id]);

      await client.query(`
        INSERT INTO cash_boxes (company_id, name, code, current_balance, account_id)
        SELECT $1, $2, $3, $4, $5
        WHERE NOT EXISTS (SELECT 1 FROM cash_boxes WHERE company_id = $1 AND code = $3);
      `, [companyId, 'طµظ†ط¯ظˆظ‚ ظپط±ط¹ ط¹ط¯ظ†', 'CB-ADN', 300000, cashBoxAccRes.rows[0].id]);
    }

    // 5e. Seed banks
    const bankAccRes = await client.query(
      `SELECT id FROM accounts WHERE company_id = $1 AND code = $2 LIMIT 1;`,
      [companyId, '11102']
    );
    if (bankAccRes.rows.length > 0) {
      await client.query(`
        INSERT INTO banks (company_id, name, bank_name, account_number, current_balance, account_id)
        VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;
      `, [companyId, 'ط­ط³ط§ط¨ ط¨ظ†ظƒ ط§ظ„ظƒط±ظٹظ…ظٹ', 'ط¨ظ†ظƒ ط§ظ„ظƒط±ظٹظ…ظٹ', 'YE123456', 12000000, bankAccRes.rows[0].id]);

      await client.query(`
        INSERT INTO banks (company_id, name, bank_name, account_number, iban, account_id, is_active, current_balance)
        SELECT $1, $2, $3, $4, $5, $6, TRUE, $7
        WHERE NOT EXISTS (SELECT 1 FROM banks WHERE company_id = $1 AND bank_name = $3);
      `, [companyId, 'ط­ط³ط§ط¨ ط§ظ„ط¨ظ†ظƒ ط§ظ„ظٹظ…ظ†ظٹ ط§ظ„ط¯ظˆظ„ظٹ', 'ط§ظ„ط¨ظ†ظƒ ط§ظ„ظٹظ…ظ†ظٹ ط§ظ„ط¯ظˆظ„ظٹ', '1234567890', 'YE12345678901234', bankAccRes.rows[0].id, 5800000]);
    }

    // 5f. Seed cost centers
    await client.query(`
      INSERT INTO cost_centers (company_id, name_ar, name_en, code, type, budget_amount)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;
    `, [companyId, 'ط§ظ„ظپط±ط¹ ط§ظ„ط±ط¦ظٹط³ظٹ', 'Main Branch', 'HQ', 'branch', 0]);

    await client.query(`
      INSERT INTO cost_centers (company_id, name_ar, name_en, code, type, budget_amount)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (SELECT 1 FROM cost_centers WHERE company_id = $1 AND code = $4);
    `, [companyId, 'ظ‚ط³ظ… ط§ظ„ظ…ط¨ظٹط¹ط§طھ', 'Sales Department', 'CC-SAL', 'department', 1500000]);

    await client.query(`
      INSERT INTO cost_centers (company_id, name_ar, name_en, code, type, budget_amount)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (SELECT 1 FROM cost_centers WHERE company_id = $1 AND code = $4);
    `, [companyId, 'ظ‚ط³ظ… ط§ظ„ط¥ظ†طھط§ط¬', 'Production Department', 'CC-PRD', 'department', 2500000]);

    // 5g. Seed payroll components
    const payrollComps = [
      { name_ar: 'ط§ظ„ط±ط§طھط¨ ط§ظ„ط£ط³ط§ط³ظٹ', name_en: 'Base Salary', code: 'BAS', type: 'earning', method: 'fixed', amount: 0, gross: true, tax: true, ins: false },
      { name_ar: 'ط¨ط¯ظ„ ط³ظƒظ†', name_en: 'Housing Allowance', code: 'HOU', type: 'earning', method: 'fixed', amount: 150000, gross: true, tax: false, ins: false },
      { name_ar: 'ط¨ط¯ظ„ ظ†ظ‚ظ„', name_en: 'Transport Allowance', code: 'TRN', type: 'earning', method: 'fixed', amount: 50000, gross: true, tax: false, ins: false },
      { name_ar: 'ط¶ط±ظٹط¨ط© ط¯ط®ظ„', name_en: 'Income Tax', code: 'TAX', type: 'tax', method: 'formula', amount: 0, gross: false, tax: true, ins: false },
      { name_ar: 'طھط£ظ…ظٹظ†ط§طھ ط§ط¬طھظ…ط§ط¹ظٹط©', name_en: 'Social Insurance', code: 'INS', type: 'deduction', method: 'percentage', amount: 9, gross: false, tax: false, ins: true },
    ];
    for (const pc of payrollComps) {
      await client.query(`
        INSERT INTO payroll_components (company_id, name_ar, name_en, code, type, calculation_method, default_amount, affects_gross_salary, affects_tax, affects_social_insurance)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT DO NOTHING;
      `, [companyId, pc.name_ar, pc.name_en, pc.code, pc.type, pc.method, pc.amount, pc.gross, pc.tax, pc.ins]);
    }

    // 6. Seed sample customer and supplier
    await client.query(`
      INSERT INTO customers (company_id, code, name, phone, email, address, balance, is_active)
      VALUES ($1, 'CUST-001', 'ط¹ظ…ظٹظ„ ط§ظپطھط±ط§ط¶ظٹ', '+967700000001', 'demo@customer.ye', 'طµظ†ط¹ط§ط،', 0, true) ON CONFLICT DO NOTHING;
    `, [companyId]);
    await client.query(`
      INSERT INTO suppliers (company_id, code, name, phone, email, address, balance, is_active)
      VALUES ($1, 'SUP-001', 'ظ…ظˆط±ط¯ ط§ظپطھط±ط§ط¶ظٹ', '+967700000002', 'demo@supplier.ye', 'ط¬ط¯ط©', 0, true) ON CONFLICT DO NOTHING;
    `, [companyId]);

    // Set created_by for seeded document tables
    await client.query(`UPDATE accounts SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]);
    await client.query(`UPDATE customers SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]);
    await client.query(`UPDATE suppliers SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]);
    try { await client.query(`UPDATE products SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE leads SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE opportunities SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE employees SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE work_orders SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE sales_invoices SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE purchase_invoices SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }
    try { await client.query(`UPDATE transactions SET created_by = $1 WHERE company_id = $2 AND created_by IS NULL`, [adminId, companyId]); } catch (e) { /* column may not exist yet */ }

    // 7. Seed activity log (defensive: skip if table doesn't exist)
    try {
      await client.query(`
        INSERT INTO activity_logs (company_id, user_id, user_name, action, module, details)
        VALUES ($1, $2, $3, $4, $5, $6);
      `, [
        companyId,
        adminId,
        'ط§ظ„ظ†ط¸ط§ظ…',
        'طھظ‡ظٹط¦ط© ظˆطھط؛ط°ظٹط© ظ‚ط§ط¹ط¯ط© ط§ظ„ط¨ظٹط§ظ†ط§طھ MaghzAccountFlash35',
        'ط§ظ„ط£ط³ط§ط³ (Core)',
        `طھظ… ط¥ظ†ط´ط§ط، ط§ظ„ط¬ط¯ط§ظˆظ„ ط§ظ„ط£ط³ط§ط³ظٹط© ظˆطھط£ط³ظٹط³ ط¯ظ„ظٹظ„ ط§ظ„ط­ط³ط§ط¨ط§طھ ظ„ظ„ط´ط±ظƒط© "${companyId}" ط¨ط§ظ„ط±ظٹط§ظ„ ط§ظ„ظٹظ…ظ†ظٹ (YER) ط¨ظ†ط¬ط§ط­.`
      ]);
    } catch (logErr) {
      console.warn('[DB] Could not write activity log:', logErr.message);
    }

    await client.query('COMMIT');
    console.log('[DB] Initial data seeding completed with YER currency.');
    return companyId;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Seeding failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// â”€â”€â”€ IPC Handlers for Onboarding â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function registerOnboardingHandlers() {
  // Test connection with provided config
  ipcMain.handle('db:test-connection', async (_event, config) => {
    const testPool = new Pool({
      host: config.host || 'localhost',
      port: parseInt(config.port || '5432'),
      database: config.database || 'postgres',
      user: config.user || 'postgres',
      password: config.password || '',
      connectionTimeoutMillis: 5000,
      max: 2,
    });
    try {
      const client = await testPool.connect();
      const result = await client.query('SELECT NOW() as time, current_database() as db, version() as version');
      client.release();
      await testPool.end();
      return { success: true, time: result.rows[0].time, db: result.rows[0].db, version: result.rows[0].version };
    } catch (err) {
      await testPool.end();
      return { success: false, error: err.message };
    }
  });

  // Update active pool config
  ipcMain.handle('db:update-config', async (_event, config) => {
    if (pool) {
      await pool.end();
    }
    pool = new Pool({
      host: config.host || 'localhost',
      port: parseInt(config.port || '5432'),
      database: config.database || 'MaghzAccountFlash35',
      user: config.user || 'maghz',
      password: config.password || '',
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pool.on('error', (err) => {
      console.error('[DB] Unexpected pool error:', err.message);
    });
    return { success: true };
  });

  // Get DB info
  ipcMain.handle('db:info', async () => {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT current_database() as db, NOW() as time');
      client.release();
      return { success: true, db: result.rows[0].db, time: result.rows[0].time };
    } catch (err) {
      return { success: false, error: err.message };
    }
  });

  // Clear all data (factory reset)
  ipcMain.handle('db:clear-all', async () => {
    try {
      const client = wrapClient(await pool.connect());
      try {
        await client.query('BEGIN');

        // Get all table names in the public schema
        const tablesResult = await client.query(`
          SELECT tablename FROM pg_tables
          WHERE schemaname = 'public' AND tablename != 'pg_stat_statements'
        `);

        const tables = tablesResult.rows.map(r => r.tablename);
        console.log(`[DB] Clearing ${tables.length} tables...`);

        if (tables.length > 0) {
          // Drop all foreign key constraints first, then truncate
          const truncateList = tables.map(t => `"${t}"`).join(', ');
          await client.query(`TRUNCATE ${truncateList} CASCADE`);
        }

        await client.query('COMMIT');
        console.log('[DB] All data cleared successfully.');
        return { success: true, tablesCleared: tables.length };
      } catch (err) {
        console.error('[DB] Clear failed, rolling back:', err.message);
        try { await client.query('ROLLBACK'); } catch {}
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[DB] Clear all error:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Seed default data (chart of accounts, company, admin user, basic settings)
  ipcMain.handle('db:seed-default', async () => {
    try {
      const companyId = await seedInitialData();
      if (!companyId) {
        // Data already exists â€” find the existing company
        const check = await pool.query('SELECT id FROM companies LIMIT 1');
        const existingId = check.rows[0]?.id;
        if (!existingId) {
          return { success: false, error: 'ظپط´ظ„ ط§ظ„ط¨ط°ط±: ظ„ط§ طھظˆط¬ط¯ ط¨ظٹط§ظ†ط§طھ ظˆظ„ط§ ظٹظ…ظƒظ† ط¥ظ†ط´ط§ط¦ظ‡ط§' };
        }
        return { success: true, companyId: existingId };
      }
      return { success: true, companyId };
    } catch (err) {
      console.error('[DB] Seed failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  // Seed demo data (extensive fake data for all modules)
  ipcMain.handle('db:seed-demo', async () => {
    try {
      const companyCheck = await pool.query('SELECT id FROM companies LIMIT 1');
      let companyId;
      if (companyCheck.rows.length === 0) {
        const res = await seedInitialData();
        companyId = res;
      } else {
        companyId = companyCheck.rows[0].id;
      }

      const client = wrapClient(await pool.connect());
      try {
        await client.query('BEGIN');
        await client.query('DEALLOCATE ALL');
        await seedComprehensiveDemoData(client, companyId);
        await client.query('COMMIT');
        console.log('[DB] Demo data seeded successfully.');
        return { success: true, companyId };
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    } catch (err) {
      console.error('[DB] Demo seeding failed:', err.message);
      return { success: false, error: err.message };
    }
  });

  console.log('[DB] Onboarding IPC handlers registered.');
}
