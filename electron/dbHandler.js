import { ipcMain } from 'electron';
import pg from 'pg';

const { Pool } = pg;

let pool = null;

// Create database connection pool
function createPool() {
  pool = new Pool({
    host: process.env.VITE_DB_HOST || 'localhost',
    port: parseInt(process.env.VITE_DB_PORT || '5432'),
    database: process.env.VITE_DB_NAME || 'MaghzAccountFlash35',
    user: process.env.VITE_DB_USER || 'Maghz',
    password: process.env.VITE_DB_PASSWORD || 'Zaamla2026',
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

  // Execute generic query
  ipcMain.handle('db:query', async (_event, { sql, params }) => {
    try {
      const result = await pool.query(sql, params || []);
      return { success: true, rows: result.rows, rowCount: result.rowCount };
    } catch (err) {
      console.error('[DB] Query error:', err.message, '\nSQL:', sql);
      return { success: false, error: err.message };
    }
  });

  // Execute transaction (array of { sql, params })
  ipcMain.handle('db:transaction', async (_event, queries) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const { sql, params } of queries) {
        const res = await client.query(sql, params || []);
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

// Run schema migration (create tables if not exists)
export async function initializeSchema() {
  if (!pool) createPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Companies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        currency CHAR(3) NOT NULL DEFAULT 'YER',
        tax_number VARCHAR(50),
        address TEXT,
        phone VARCHAR(50),
        email VARCHAR(255),
        logo_url TEXT,
        fiscal_year_start DATE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'accountant',
        password_hash TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, username)
      );
    `);

    // Accounts (Chart of Accounts) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(20) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        parent_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
        type VARCHAR(20) NOT NULL CHECK(type IN ('asset','liability','equity','revenue','expense')),
        nature VARCHAR(10) NOT NULL CHECK(nature IN ('debit','credit')),
        is_group BOOLEAN NOT NULL DEFAULT FALSE,
        balance NUMERIC(18,4) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        user_id VARCHAR(50),
        user_name VARCHAR(100),
        action TEXT NOT NULL,
        module VARCHAR(100),
        details TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Products table
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(50) NOT NULL,
        name_ar VARCHAR(255) NOT NULL,
        name_en VARCHAR(255),
        barcode VARCHAR(100),
        sku VARCHAR(100),
        unit VARCHAR(50) NOT NULL DEFAULT 'قطعة',
        cost_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        sale_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        stock_qty NUMERIC(18,4) NOT NULL DEFAULT 0,
        min_stock_alert NUMERIC(18,4),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Contacts (Customers & Vendors) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL CHECK(type IN ('customer','vendor','both')),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        tax_number VARCHAR(50),
        balance NUMERIC(18,4) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Transactions (Journal Header) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        reference VARCHAR(100),
        description TEXT,
        total_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
        created_by UUID REFERENCES users(id),
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','posted','cancelled')),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Journal Entries (Double-Entry Lines) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
        account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
        debit NUMERIC(18,4) NOT NULL DEFAULT 0,
        credit NUMERIC(18,4) NOT NULL DEFAULT 0,
        memo TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_account ON journal_entries(account_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_logs_company ON activity_logs(company_id);`);

    await client.query('COMMIT');
    console.log('[DB] Schema initialization complete.');
    return true;
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] Schema init failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

// Seed initial data
export async function seedInitialData() {
  if (!pool) createPool();

  // Check if already seeded
  const check = await pool.query("SELECT COUNT(*) FROM companies");
  if (parseInt(check.rows[0].count) > 0) {
    console.log('[DB] Data already seeded, skipping.');
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed company with YER currency
    const companyResult = await client.query(`
      INSERT INTO companies (name, name_en, currency, tax_number, address, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id;
    `, [
      'شركة المغز التجارية المحدودة',
      'Maghz Trading Company Ltd.',
      'YER',
      '100123456789',
      'صنعاء، الجمهورية اليمنية',
      '+967712345678',
      'info@maghz-erp.com'
    ]);

    const companyId = companyResult.rows[0].id;

    // 2. Seed admin user
    const userResult = await client.query(`
      INSERT INTO users (company_id, username, email, role)
      VALUES ($1, $2, $3, $4)
      RETURNING id;
    `, [companyId, 'مدير النظام', 'admin@maghz-erp.com', 'admin']);

    const adminId = userResult.rows[0].id;

    // 3. Seed Chart of Accounts

    // Assets
    const assetsRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '1', 'الأصول', 'Assets', 'asset', 'debit', TRUE) RETURNING id;
    `, [companyId]);
    const assetsId = assetsRes.rows[0].id;

    const curAssetsRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group)
      VALUES ($1, '11', 'الأصول المتداولة', 'Current Assets', $2, 'asset', 'debit', TRUE) RETURNING id;
    `, [companyId, assetsId]);
    const curAssetsId = curAssetsRes.rows[0].id;

    const cashGroupRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group)
      VALUES ($1, '111', 'الصندوق والبنوك', 'Cash & Banks', $2, 'asset', 'debit', TRUE) RETURNING id;
    `, [companyId, curAssetsId]);
    const cashGroupId = cashGroupRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '111001', 'الصندوق الرئيسي', 'Main Safe Cash', $2, 'asset', 'debit', FALSE, 5000000);
    `, [companyId, cashGroupId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '111002', 'حساب بنك الكريمي', 'Al Karimi Bank', $2, 'asset', 'debit', FALSE, 12000000);
    `, [companyId, cashGroupId]);

    // Liabilities
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '2', 'الالتزامات', 'Liabilities', 'liability', 'credit', TRUE);
    `, [companyId]);

    // Equity
    const equityRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '3', 'حقوق الملكية', 'Equity', 'equity', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const equityId = equityRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '311001', 'رأس المال المدفوع', 'Paid-in Capital', $2, 'equity', 'credit', FALSE, 20000000);
    `, [companyId, equityId]);

    // Revenues
    const revenueRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '4', 'الإيرادات', 'Revenues', 'revenue', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const revenueId = revenueRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '411001', 'مبيعات المنتجات', 'Product Sales', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    // Expenses
    const expenseRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '5', 'المصروفات', 'Expenses', 'expense', 'debit', TRUE) RETURNING id;
    `, [companyId]);
    const expenseId = expenseRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '511001', 'مصروفات الإيجار', 'Rent Expense', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '511002', 'رواتب وأجور', 'Salaries & Wages', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    // 4. Seed activity log
    await client.query(`
      INSERT INTO activity_logs (company_id, user_id, user_name, action, module, details)
      VALUES ($1, $2, $3, $4, $5, $6);
    `, [
      companyId,
      adminId,
      'النظام',
      'تهيئة وتغذية قاعدة البيانات MaghzAccountFlash35',
      'الأساس (Core)',
      `تم إنشاء الجداول الأساسية وتأسيس دليل الحسابات للشركة "${companyId}" بالريال اليمني (YER) بنجاح.`
    ]);

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
