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
    throw new Error(`متغير البيئة ${key} غير محدد. تأكد من ملف .env.local`);
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

  // Execute generic query
  ipcMain.handle('db:query', async (_event, { sql, params }) => {
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

  // Execute transaction (array of { sql, params })
  ipcMain.handle('db:transaction', async (_event, queries) => {
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
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS date_format VARCHAR(20) DEFAULT 'yyyy-MM-dd';`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS decimal_places INTEGER DEFAULT 2;`);
    await client.query(`ALTER TABLE companies ADD COLUMN IF NOT EXISTS calendar VARCHAR(10) DEFAULT 'gregorian';`);

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        email VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'accountant',
        branch_id UUID,
        password_hash TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, username)
      );
    `);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID;`);

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

    // Roles table
    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description VARCHAR(255),
        permissions TEXT,
        is_system BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS description VARCHAR(255);`);
  await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE;`);
  await client.query(`ALTER TABLE roles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();`);

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
        unit VARCHAR(50) NOT NULL DEFAULT 'piece',
        category_id UUID,
        product_type_id UUID REFERENCES product_types(id) ON DELETE SET NULL,
        cost_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        sale_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS product_product_categories (
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
        PRIMARY KEY (product_id, category_id)
      );
    `);

    // Warehouses table
    await client.query(`
      CREATE TABLE IF NOT EXISTS warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        branch_id UUID,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Stock table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        product_id UUID NOT NULL,
        warehouse_id UUID NOT NULL,
        quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
        min_stock_alert NUMERIC(18,4),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Stock Movements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL,
        product_id UUID NOT NULL,
        warehouse_id UUID NOT NULL,
        type VARCHAR(20) NOT NULL,
        quantity NUMERIC(18,4) NOT NULL,
        reference VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
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

    // Customers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(50),
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        address TEXT,
        tax_number VARCHAR(50),
        credit_limit NUMERIC(18,4),
        balance NUMERIC(18,4) NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Suppliers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(50),
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

    // Branches table
    await client.query(`
      CREATE TABLE IF NOT EXISTS branches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        address TEXT,
        city VARCHAR(100),
        phone VARCHAR(50),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Currencies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        code VARCHAR(3) NOT NULL,
        name VARCHAR(50) NOT NULL,
        symbol VARCHAR(10),
        exchange_rate NUMERIC(18,6) NOT NULL DEFAULT 1,
        is_default BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // VAT Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS vat_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) DEFAULT 'ضريبة القيمة المضافة',
        account_id UUID,
        vat_rate NUMERIC(5,2) NOT NULL DEFAULT 15,
        vat_number VARCHAR(50),
        is_inclusive BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Receipt Vouchers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS receipt_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        voucher_number VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
        amount NUMERIC(18,4) NOT NULL DEFAULT 0,
        payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
        bank_account_id UUID,
        check_number VARCHAR(50),
        check_date DATE,
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Payment Vouchers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        voucher_number VARCHAR(50) NOT NULL,
        date DATE NOT NULL,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
        expense_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
        amount NUMERIC(18,4) NOT NULL DEFAULT 0,
        payment_method VARCHAR(20) NOT NULL DEFAULT 'cash',
        bank_account_id UUID,
        check_number VARCHAR(50),
        check_date DATE,
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Sales Returns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        return_number VARCHAR(50) NOT NULL,
        invoice_id UUID REFERENCES sales_invoices(id) ON DELETE SET NULL,
        customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
        date DATE NOT NULL,
        subtotal NUMERIC(18,4) NOT NULL DEFAULT 0,
        vat_amount NUMERIC(18,4) DEFAULT 0,
        total_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Sales Return Lines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_return_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID REFERENCES sales_returns(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
        quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
        unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        line_total NUMERIC(18,4) NOT NULL DEFAULT 0
      );
    `);

    // Purchase Returns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_returns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        return_number VARCHAR(50) NOT NULL,
        invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE SET NULL,
        supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT,
        date DATE NOT NULL,
        subtotal NUMERIC(18,4) NOT NULL DEFAULT 0,
        vat_amount NUMERIC(18,4) DEFAULT 0,
        total_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
        reason TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Purchase Return Lines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_return_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        return_id UUID REFERENCES purchase_returns(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
        quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
        unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        line_total NUMERIC(18,4) NOT NULL DEFAULT 0
      );
    `);

    // Quotation Lines table
    await client.query(`
      CREATE TABLE IF NOT EXISTS quotation_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quotation_id UUID REFERENCES quotations(id) ON DELETE CASCADE,
        product_id UUID REFERENCES products(id) ON DELETE RESTRICT,
        quantity NUMERIC(18,4) NOT NULL DEFAULT 0,
        unit_price NUMERIC(18,4) NOT NULL DEFAULT 0,
        discount_percent NUMERIC(5,2) DEFAULT 0,
        line_total NUMERIC(18,4) NOT NULL DEFAULT 0
      );
    `);

    // Document sequences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_sequences (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        document_type VARCHAR(50) NOT NULL,
        prefix VARCHAR(20),
        suffix VARCHAR(20),
        starting_number INTEGER NOT NULL DEFAULT 1,
        current_number INTEGER NOT NULL DEFAULT 1,
        increment_step INTEGER NOT NULL DEFAULT 1,
        padding_length INTEGER NOT NULL DEFAULT 4,
        year_reset BOOLEAN NOT NULL DEFAULT FALSE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );
    `);

    // Default accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS default_accounts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        function_key VARCHAR(50) NOT NULL,
        account_id UUID,
        is_required BOOLEAN DEFAULT TRUE,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, function_key)
      );
    `);

    // Product types table
    await client.query(`
      CREATE TABLE IF NOT EXISTS product_types (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name_ar VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        code VARCHAR(20),
        appears_in_sales BOOLEAN DEFAULT TRUE,
        appears_in_purchases BOOLEAN DEFAULT TRUE,
        appears_in_inventory BOOLEAN DEFAULT TRUE,
        appears_in_manufacturing BOOLEAN DEFAULT FALSE,
        has_stock_tracking BOOLEAN DEFAULT TRUE,
        has_bom BOOLEAN DEFAULT FALSE,
        default_sales_account_id UUID,
        default_cogs_account_id UUID,
        default_inventory_account_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Units table
    await client.query(`
      CREATE TABLE IF NOT EXISTS units (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name_ar VARCHAR(50) NOT NULL,
        name_en VARCHAR(50),
        code VARCHAR(20),
        conversion_factor NUMERIC(18,6) DEFAULT 1,
        base_unit_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Cash boxes table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cash_boxes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(20),
        account_id UUID,
        branch_id UUID,
        responsible_user_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        current_balance NUMERIC(18,4) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Banks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS banks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        bank_name VARCHAR(100),
        account_number VARCHAR(50),
        iban VARCHAR(50),
        account_id UUID,
        branch_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        current_balance NUMERIC(18,4) DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Cost centers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cost_centers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name_ar VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        code VARCHAR(20),
        parent_id UUID,
        type VARCHAR(20) DEFAULT 'branch',
        budget_amount NUMERIC(18,4) DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Payroll components table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payroll_components (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name_ar VARCHAR(100) NOT NULL,
        name_en VARCHAR(100),
        code VARCHAR(20),
        type VARCHAR(20) DEFAULT 'earning',
        calculation_method VARCHAR(50) DEFAULT 'fixed',
        default_amount NUMERIC(18,4) DEFAULT 0,
        affects_gross_salary BOOLEAN DEFAULT TRUE,
        affects_tax BOOLEAN DEFAULT FALSE,
        affects_social_insurance BOOLEAN DEFAULT FALSE,
        default_account_id UUID,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(company_id, code)
      );
    `);

    // Add created_by / updated_by to document tables for user-level ownership tracking
    const documentTables = [
      'accounts', 'transactions', 'customers', 'suppliers', 'sales_invoices',
      'quotations', 'sales_returns', 'purchase_invoices', 'purchase_orders',
      'purchase_returns', 'products', 'warehouses', 'stock_movements',
      'warehouse_transfers', 'departments', 'employees', 'attendance', 'leaves',
      'payroll_runs', 'end_of_service', 'leads', 'opportunities', 'crm_activities',
      'calls', 'boms', 'work_orders', 'receipt_vouchers', 'payment_vouchers',
      'cash_boxes', 'banks',
    ];
    for (const tbl of documentTables) {
      if (tbl !== 'transactions') {
        await client.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS created_by UUID;`);
      }
      await client.query(`ALTER TABLE ${tbl} ADD COLUMN IF NOT EXISTS updated_by UUID;`);
    }

    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_accounts_company ON accounts(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_accounts_parent ON accounts(parent_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_journal_account ON journal_entries(account_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_logs_company ON activity_logs(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_receipt_vouchers_company ON receipt_vouchers(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payment_vouchers_company ON payment_vouchers(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_returns_company ON sales_returns(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_purchase_returns_company ON purchase_returns(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_warehouses_company ON warehouses(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_company ON stock(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_product ON stock(product_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_warehouse ON stock(warehouse_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_stock_movements_company ON stock_movements(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_default_accounts_company ON default_accounts(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_product_types_company ON product_types(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_units_company ON units(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cash_boxes_company ON cash_boxes(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_banks_company ON banks(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cost_centers_company ON cost_centers(company_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payroll_components_company ON payroll_components(company_id);`);

    // Indexes for created_by on document tables
    const createdByIndexTables = [
      'transactions', 'customers', 'suppliers', 'sales_invoices', 'quotations',
      'sales_returns', 'purchase_invoices', 'purchase_orders', 'purchase_returns',
      'products', 'stock_movements', 'warehouse_transfers', 'departments',
      'employees', 'attendance', 'leaves', 'payroll_runs', 'leads', 'opportunities',
      'crm_activities', 'calls', 'boms', 'work_orders', 'receipt_vouchers',
      'payment_vouchers', 'cash_boxes', 'banks',
    ];
    for (const tbl of createdByIndexTables) {
      await client.query(`CREATE INDEX IF NOT EXISTS idx_${tbl}_created_by ON ${tbl}(created_by);`);
    }

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
    const adminPasswordHash = hashPasswordNode('admin123');
    const userResult = await client.query(`
      INSERT INTO users (company_id, username, email, full_name, role, password_hash)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id;
    `, [companyId, 'مدير النظام', 'admin@maghz-erp.com', 'مدير النظام', 'admin', adminPasswordHash]);

    const adminId = userResult.rows[0].id;

    // 2a. Seed default admin role
    await client.query(`
      INSERT INTO roles (company_id, name, description, permissions, is_system)
      SELECT $1, 'مدير النظام', 'مدير النظام - صلاحيات كاملة', '["all"]', TRUE
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE roles.company_id = $1 AND roles.is_system = TRUE);
    `, [companyId]);

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
      VALUES ($1, '11101', 'الصندوق الرئيسي', 'Main Cash', $2, 'asset', 'debit', FALSE, 5000000);
    `, [companyId, cashGroupId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11102', 'حساب بنك الكريمي', 'Yemen International Bank', $2, 'asset', 'debit', FALSE, 12000000);
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
      VALUES ($1, '31101', 'رأس المال المدفوع', 'Paid-in Capital', $2, 'equity', 'credit', FALSE, 20000000);
    `, [companyId, equityId]);

    // Revenues
    const revenueRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '4', 'الإيرادات', 'Revenues', 'revenue', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const revenueId = revenueRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '41101', 'مبيعات المنتجات', 'Product Sales', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    // Expenses
    const expenseRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '5', 'المصروفات', 'Expenses', 'expense', 'debit', TRUE) RETURNING id;
    `, [companyId]);
    const expenseId = expenseRes.rows[0].id;

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '52201', 'مصروفات الإيجار', 'Rent Expense', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '52101', 'رواتب الموظفين', 'Employee Salaries', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    // Trade Debtors
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11201', 'المدينون التجاريون', 'Trade Customers', $2, 'asset', 'debit', FALSE, 0);
    `, [companyId, curAssetsId]);

    // Inventory
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '11301', 'بضاعة أول المدة', 'Opening Inventory', $2, 'asset', 'debit', FALSE, 0);
    `, [companyId, curAssetsId]);

    // Liabilities sub-accounts
    const liabRes = await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, type, nature, is_group)
      VALUES ($1, '2', 'الالتزامات', 'Liabilities', 'liability', 'credit', TRUE) RETURNING id;
    `, [companyId]);
    const liabId = liabRes.rows[0].id;

    // Trade Creditors
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '21101', 'الدائنون التجاريون', 'Trade Suppliers', $2, 'liability', 'credit', FALSE, 0);
    `, [companyId, liabId]);

    // VAT Payable
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '21301', 'ضريبة القيمة المضافة', 'VAT Payable', $2, 'liability', 'credit', FALSE, 0);
    `, [companyId, liabId]);

    // Additional revenue accounts
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '41102', 'مبيعات الخدمات', 'Services Sales', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '41103', 'مردودات المبيعات', 'Sales Returns', $2, 'revenue', 'credit', FALSE, 0);
    `, [companyId, revenueId]);

    // COGS
    await client.query(`
      INSERT INTO accounts (company_id, code, name_ar, name_en, parent_id, type, nature, is_group, balance)
      VALUES ($1, '51101', 'تكلفة بضاعة مباعة', 'Cost of Goods Sold', $2, 'expense', 'debit', FALSE, 0);
    `, [companyId, expenseId]);

    // 4. Seed basic settings
    await client.query(`
      INSERT INTO vat_settings (company_id, vat_rate, vat_number, is_inclusive, is_active)
      VALUES ($1, 15, '3100123456', false, true) ON CONFLICT DO NOTHING;
    `, [companyId]);

    await client.query(`
      INSERT INTO currencies (company_id, code, name, symbol, exchange_rate, is_default, is_active)
      VALUES ($1, 'YER', 'الريال اليمني', 'ر.ي', 1, true, true) ON CONFLICT DO NOTHING;
    `, [companyId]);

    await client.query(`
      INSERT INTO branches (company_id, name, code, address, is_active)
      VALUES ($1, 'الفرع الرئيسي', 'HQ', 'صنعاء - شارع الستين', true) ON CONFLICT DO NOTHING;
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
    `, [companyId, 'سلعة تجارية', 'Trading Goods', 'TRADE']);

    // 5c. Seed units
    await client.query(`
      INSERT INTO units (company_id, name_ar, name_en, code, conversion_factor)
      VALUES ($1, $2, $3, $4, 1) ON CONFLICT DO NOTHING;
    `, [companyId, 'قطعة', 'Piece', 'PC']);

    // 5d. Seed cash boxes
    const cashBoxAccRes = await client.query(
      `SELECT id FROM accounts WHERE company_id = $1 AND code = $2 LIMIT 1;`,
      [companyId, '11101']
    );
    if (cashBoxAccRes.rows.length > 0) {
      await client.query(`
        INSERT INTO cash_boxes (company_id, name, code, current_balance, account_id)
        VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING;
      `, [companyId, 'الصندوق الرئيسي', 'MAIN-CB', 5000000, cashBoxAccRes.rows[0].id]);

      await client.query(`
        INSERT INTO cash_boxes (company_id, name, code, current_balance, account_id)
        SELECT $1, $2, $3, $4, $5
        WHERE NOT EXISTS (SELECT 1 FROM cash_boxes WHERE company_id = $1 AND code = $3);
      `, [companyId, 'صندوق فرع الحديدة', 'CB-HOD', 200000, cashBoxAccRes.rows[0].id]);

      await client.query(`
        INSERT INTO cash_boxes (company_id, name, code, current_balance, account_id)
        SELECT $1, $2, $3, $4, $5
        WHERE NOT EXISTS (SELECT 1 FROM cash_boxes WHERE company_id = $1 AND code = $3);
      `, [companyId, 'صندوق فرع عدن', 'CB-ADN', 300000, cashBoxAccRes.rows[0].id]);
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
      `, [companyId, 'حساب بنك الكريمي', 'بنك الكريمي', 'YE123456', 12000000, bankAccRes.rows[0].id]);

      await client.query(`
        INSERT INTO banks (company_id, name, bank_name, account_number, iban, account_id, is_active, current_balance)
        SELECT $1, $2, $3, $4, $5, $6, TRUE, $7
        WHERE NOT EXISTS (SELECT 1 FROM banks WHERE company_id = $1 AND bank_name = $3);
      `, [companyId, 'حساب البنك اليمني الدولي', 'البنك اليمني الدولي', '1234567890', 'YE12345678901234', bankAccRes.rows[0].id, 5800000]);
    }

    // 5f. Seed cost centers
    await client.query(`
      INSERT INTO cost_centers (company_id, name_ar, name_en, code, type, budget_amount)
      VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING;
    `, [companyId, 'الفرع الرئيسي', 'Main Branch', 'HQ', 'branch', 0]);

    await client.query(`
      INSERT INTO cost_centers (company_id, name_ar, name_en, code, type, budget_amount)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (SELECT 1 FROM cost_centers WHERE company_id = $1 AND code = $4);
    `, [companyId, 'قسم المبيعات', 'Sales Department', 'CC-SAL', 'department', 1500000]);

    await client.query(`
      INSERT INTO cost_centers (company_id, name_ar, name_en, code, type, budget_amount)
      SELECT $1, $2, $3, $4, $5, $6
      WHERE NOT EXISTS (SELECT 1 FROM cost_centers WHERE company_id = $1 AND code = $4);
    `, [companyId, 'قسم الإنتاج', 'Production Department', 'CC-PRD', 'department', 2500000]);

    // 5g. Seed payroll components
    const payrollComps = [
      { name_ar: 'الراتب الأساسي', name_en: 'Base Salary', code: 'BAS', type: 'earning', method: 'fixed', amount: 0, gross: true, tax: true, ins: false },
      { name_ar: 'بدل سكن', name_en: 'Housing Allowance', code: 'HOU', type: 'earning', method: 'fixed', amount: 150000, gross: true, tax: false, ins: false },
      { name_ar: 'بدل نقل', name_en: 'Transport Allowance', code: 'TRN', type: 'earning', method: 'fixed', amount: 50000, gross: true, tax: false, ins: false },
      { name_ar: 'ضريبة دخل', name_en: 'Income Tax', code: 'TAX', type: 'tax', method: 'formula', amount: 0, gross: false, tax: true, ins: false },
      { name_ar: 'تأمينات اجتماعية', name_en: 'Social Insurance', code: 'INS', type: 'deduction', method: 'percentage', amount: 9, gross: false, tax: false, ins: true },
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
      VALUES ($1, 'CUST-001', 'عميل افتراضي', '+967700000001', 'demo@customer.ye', 'صنعاء', 0, true) ON CONFLICT DO NOTHING;
    `, [companyId]);
    await client.query(`
      INSERT INTO suppliers (company_id, code, name, phone, email, address, balance, is_active)
      VALUES ($1, 'SUP-001', 'مورد افتراضي', '+967700000002', 'demo@supplier.ye', 'جدة', 0, true) ON CONFLICT DO NOTHING;
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
        'النظام',
        'تهيئة وتغذية قاعدة البيانات MaghzAccountFlash35',
        'الأساس (Core)',
        `تم إنشاء الجداول الأساسية وتأسيس دليل الحسابات للشركة "${companyId}" بالريال اليمني (YER) بنجاح.`
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

// ─── IPC Handlers for Onboarding ─────────────────────────────────────────────

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
        // Data already exists — find the existing company
        const check = await pool.query('SELECT id FROM companies LIMIT 1');
        const existingId = check.rows[0]?.id;
        if (!existingId) {
          return { success: false, error: 'فشل البذر: لا توجد بيانات ولا يمكن إنشائها' };
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
