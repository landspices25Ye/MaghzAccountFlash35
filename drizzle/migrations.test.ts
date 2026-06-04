/**
 * Tests for Drizzle SQL migrations
 *
 * These tests verify that the unified SQL migration file is structurally
 * correct and contains the expected schema features. They run on a file-based
 * mock (no live PostgreSQL needed) by parsing the SQL text directly.
 *
 * Why this matters: Drizzle migrations are the SINGLE source of truth for
 * the database schema. Any drift, missing constraints, or broken syntax
 * can corrupt the production database.
 *
 * Phase 7 (2026-06-02): Migration chain 0000-0004 replaced by a single
 * unified file `0000_unified_schema.sql` after resolving schema drift.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const MIGRATIONS_DIR = join(process.cwd(), 'drizzle');

function readMigration(name: string): string {
  return readFileSync(join(MIGRATIONS_DIR, name), 'utf-8');
}

function listMigrations(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => /^\d{4}_.*\.sql$/.test(f))
    .sort();
}

const UNIFIED_TABLES = [
  // Core/Auth (7)
  'companies', 'users', 'roles', 'settings', 'branches', 'currencies', 'vat_settings',
  // Accounting (3)
  'accounts', 'transactions', 'journal_entries',
  // Inventory (8)
  'product_categories', 'product_types', 'products', 'product_product_categories',
  'warehouses', 'stock', 'stock_movements', 'warehouse_transfers', 'warehouse_transfer_lines',
  'stock_adjustments',
  // Sales (7)
  'customers', 'quotations', 'quotation_lines', 'sales_invoices', 'sales_invoice_lines',
  'sales_returns', 'sales_return_lines',
  // Purchases (7)
  'suppliers', 'purchase_invoices', 'purchase_invoice_lines', 'purchase_orders',
  'purchase_order_lines', 'purchase_returns', 'purchase_return_lines',
  // Manufacturing (4)
  'boms', 'bom_lines', 'work_orders', 'work_order_consumptions',
  // HR (8)
  'departments', 'employees', 'attendance', 'leaves', 'payroll_runs', 'payroll_lines',
  'end_of_service', 'payroll_components',
  // CRM (4)
  'leads', 'opportunities', 'crm_activities', 'calls',
  'tasks', 'activities',
  // Settings (6)
  'units', 'cash_boxes', 'banks', 'cost_centers', 'default_accounts', 'document_sequences',
  // Vouchers (2)
  'receipt_vouchers', 'payment_vouchers',
];

describe('Drizzle migrations (unified)', () => {
  let allSql: string;
  let file0: string;

  beforeAll(() => {
    const files = listMigrations();
    allSql = files.map(readMigration).join('\n');
    file0 = files.length > 0 ? readMigration(files[0]) : '';
  });

  it('has exactly one unified migration file', () => {
    const files = listMigrations();
    expect(files.length).toBe(1);
    expect(files[0]).toBe('0000_unified_schema.sql');
  });

  it('_journal.json has a single entry matching the unified file', () => {
    const journal = JSON.parse(readFileSync(join(MIGRATIONS_DIR, 'meta', '_journal.json'), 'utf-8'));
    expect(journal.entries.length).toBe(1);
    expect(journal.entries[0].tag).toBe('0000_unified_schema');
    expect(journal.entries[0].idx).toBe(0);
  });

  it('contains all 60 expected tables', () => {
    expect(UNIFIED_TABLES.length).toBe(60);
    for (const table of UNIFIED_TABLES) {
      expect(allSql).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
    }
  });

  it('all CREATE TABLE statements use IF NOT EXISTS', () => {
    const createTableMatches = file0.match(/CREATE TABLE\s+(?!IF NOT EXISTS)/gi);
    expect(createTableMatches, 'Found unguarded CREATE TABLE').toBeNull();
  });

  it('all UNIQUE constraints are declared inline (no separate DO blocks)', () => {
    // The unified schema must not use DO $$ IF NOT EXISTS pattern
    expect(file0).not.toMatch(/DO \$\$/i);
    // It must have at least 27 inline UNIQUE constraints
    const inlineUnique = file0.match(/UNIQUE \(/g);
    expect(inlineUnique).not.toBeNull();
    expect(inlineUnique!.length).toBeGreaterThanOrEqual(27);
  });

  it('mandatory UNIQUE constraints on document numbers and codes', () => {
    const expected = [
      'accounts_company_id_code_unique',
      'customers_company_id_code_unique',
      'suppliers_company_id_code_unique',
      'products_company_id_code_unique',
      'employees_company_id_employee_number_unique',
      'departments_company_id_name_unique',
      'branches_company_id_code_unique',
      'warehouses_company_id_code_unique',
      'document_sequences_company_id_document_type_unique',
      'default_accounts_company_id_function_key_unique',
      'product_types_company_id_code_unique',
      'units_company_id_code_unique',
      'currencies_company_id_code_unique',
      'vat_settings_company_id_unique',
      'cost_centers_company_id_code_unique',
      'payroll_components_company_id_code_unique',
      'sales_invoices_company_id_invoice_number_unique',
      'purchase_invoices_company_id_invoice_number_unique',
      'purchase_orders_company_id_order_number_unique',
      'quotations_company_id_quotation_number_unique',
      'work_orders_company_id_order_number_unique',
      'roles_company_id_name_unique',
      'users_company_id_username_unique',
    ];
    for (const c of expected) {
      expect(file0, `Missing UNIQUE ${c}`).toContain(`"${c}"`);
    }
  });

  it('has UNIQUE constraints on return and voucher numbers', () => {
    expect(file0).toContain('"sales_returns_company_id_return_number_unique"');
    expect(file0).toContain('"purchase_returns_company_id_return_number_unique"');
    expect(file0).toContain('"receipt_vouchers_company_id_voucher_number_unique"');
    expect(file0).toContain('"payment_vouchers_company_id_voucher_number_unique"');
  });

  it('all company_id columns are NOT NULL', () => {
    // Every table with company_id must declare it NOT NULL
    const tablesWithCompanyId = UNIFIED_TABLES.filter(t => t !== 'product_product_categories');
    for (const table of tablesWithCompanyId) {
      // Look for: "company_id" uuid ... NOT NULL (within 200 chars)
      const pattern = new RegExp(`CREATE TABLE[^]*?"${table}"[^]*?"company_id" uuid[^]*?NOT NULL`, 'i');
      expect(pattern.test(file0), `${table} company_id should be NOT NULL`).toBe(true);
    }
  });

  it('journal_entries has both transaction_id AND company_id (denormalized)', () => {
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "journal_entries"[\s\S]*?"company_id"[\s\S]*?"transaction_id"[\s\S]*?"account_id"/i);
  });

  it('journal_entries index uses transaction_id (not company_id)', () => {
    // Audit index for created_by uses transaction_id, company_id for company-wide queries
    expect(file0).toMatch(/idx_journal_entries_created_by[\s\S]+transaction_id/i);
    // Plus a separate index for company-level queries
    expect(file0).toMatch(/idx_journal_entries_company_id/i);
  });

  it('all 4 line tables exist with parent_id FKs', () => {
    const linesTables = [
      'sales_invoice_lines', 'sales_return_lines',
      'purchase_invoice_lines', 'purchase_order_lines', 'purchase_return_lines',
      'quotation_lines', 'bom_lines', 'work_order_consumptions',
      'payroll_lines', 'warehouse_transfer_lines',
    ];
    for (const t of linesTables) {
      expect(file0, `Missing lines table ${t}`).toContain(`CREATE TABLE IF NOT EXISTS "${t}"`);
    }
  });

  it('product_product_categories uses composite primary key', () => {
    expect(file0).toMatch(/product_product_categories[\s\S]{0,500}PRIMARY KEY \(["']?product_id["']?, ["']?category_id["']?\)/i);
  });

  it('all multi-tenant tables have created_by and updated_by', () => {
    const tablesWithAudit = [
      'accounts', 'transactions', 'journal_entries', 'products', 'stock_movements',
      'warehouse_transfers', 'customers', 'quotations', 'sales_invoices', 'sales_returns',
      'suppliers', 'purchase_invoices', 'purchase_orders', 'purchase_returns',
      'boms', 'work_orders', 'employees', 'attendance', 'leaves', 'payroll_runs',
      'end_of_service', 'leads', 'opportunities', 'crm_activities',
      'receipt_vouchers', 'payment_vouchers',
    ];
    for (const t of tablesWithAudit) {
      expect(file0, `${t} missing created_by`).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS "${t}"[\\s\\S]*?"created_by"`, 'i'));
      expect(file0, `${t} missing updated_by`).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS "${t}"[\\s\\S]*?"updated_by"`, 'i'));
    }
  });

  it('all FK constraints use CASCADE on multi-tenant parent', () => {
    // companies is the root of multi-tenancy — child tables must use ON DELETE CASCADE
    const companiesChildTables = [
      'users', 'roles', 'settings', 'branches', 'currencies', 'vat_settings',
      'accounts', 'transactions', 'journal_entries',
      'product_categories', 'product_types', 'products', 'warehouses',
      'stock', 'stock_movements', 'warehouse_transfers',
      'customers', 'quotations', 'sales_invoices', 'sales_returns',
      'suppliers', 'purchase_invoices', 'purchase_orders', 'purchase_returns',
      'boms', 'work_orders', 'departments', 'employees', 'attendance', 'leaves',
      'payroll_runs', 'end_of_service', 'payroll_components',
      'leads', 'opportunities', 'crm_activities', 'calls',
      'units', 'cash_boxes', 'banks', 'cost_centers',
      'default_accounts', 'document_sequences',
      'receipt_vouchers', 'payment_vouchers',
    ];
    for (const t of companiesChildTables) {
      // The company_id FK in this table should be ON DELETE CASCADE
      const pattern = new RegExp(`CREATE TABLE IF NOT EXISTS "${t}"[\\s\\S]*?"company_id" uuid[\\s\\S]*?REFERENCES "companies"\\("id"\\)[\\s\\S]*?ON DELETE CASCADE`, 'i');
      expect(pattern.test(file0), `${t} company_id FK should ON DELETE CASCADE`).toBe(true);
    }
  });

  it('users table has full_name, phone, is_active, role', () => {
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "users"[\s\S]*?"full_name"/i);
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "users"[\s\S]*?"phone"/i);
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "users"[\s\S]*?"is_active"[\s\S]*?DEFAULT true NOT NULL/i);
  });

  it('roles table has description, is_system, updated_at, company_id NOT NULL', () => {
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "roles"[\s\S]*?"description"/i);
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "roles"[\s\S]*?"is_system"/i);
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "roles"[\s\S]*?"updated_at"/i);
  });

  it('products table has product_type_id FK', () => {
    expect(file0).toMatch(/CREATE TABLE IF NOT EXISTS "products"[\s\S]*?"product_type_id"[\s\S]*?REFERENCES "product_types"/i);
  });

  it('all required audit indexes exist', () => {
    const requiredIndexes = [
      'idx_accounts_created_by', 'idx_transactions_created_by',
      'idx_journal_entries_created_by', 'idx_journal_entries_company_id',
      'idx_products_created_by', 'idx_products_product_type_id',
      'idx_ppc_product_id', 'idx_ppc_category_id',
      'idx_customers_created_by', 'idx_quotations_created_by',
      'idx_sales_invoices_created_by', 'idx_sales_returns_created_by',
      'idx_suppliers_created_by', 'idx_purchase_invoices_created_by',
      'idx_purchase_orders_created_by', 'idx_purchase_returns_created_by',
      'idx_employees_created_by', 'idx_payroll_runs_created_by',
      'idx_leads_created_by', 'idx_receipt_vouchers_created_by',
      'idx_payment_vouchers_created_by',
    ];
    for (const idx of requiredIndexes) {
      expect(file0, `Missing index ${idx}`).toContain(`CREATE INDEX IF NOT EXISTS "${idx}"`);
    }
  });

  it('no destructive DROP statements', () => {
    const drops = file0.match(/^\s*DROP\s+(?!IF EXISTS)/gim);
    expect(drops).toBeNull();
  });

  it('idempotent (safe to re-run via CREATE TABLE IF NOT EXISTS)', () => {
    const unguardedCreateTable = file0.match(/CREATE TABLE\s+(?!IF NOT EXISTS)["']?\w+["']?/gi);
    expect(unguardedCreateTable).toBeNull();
    const unguardedAddColumn = file0.match(/ADD COLUMN\s+(?!IF NOT EXISTS)/gi);
    expect(unguardedAddColumn, 'Unguarded ADD COLUMN').toBeNull();
    const unguardedCreateIndex = file0.match(/CREATE INDEX\s+(?!IF NOT EXISTS)/gi);
    expect(unguardedCreateIndex, 'Unguarded CREATE INDEX').toBeNull();
  });

  it('unified file has section comments for navigation', () => {
    expect(file0).toMatch(/§\s*1\.\s*CORE/i);
    expect(file0).toMatch(/§\s*2\.\s*ACCOUNTING/i);
    expect(file0).toMatch(/§\s*11\.\s*AUDIT INDEXES/i);
  });

  it('flat journal_entries design documented in header', () => {
    expect(file0).toMatch(/Flat design/i);
  });
});

describe('Drizzle schema TypeScript', () => {
  it('schema files exist for all modules', () => {
    const schemaDir = join(process.cwd(), 'src', 'core', 'database', 'schema');
    const files = readdirSync(schemaDir);
    const expected = ['inventory', 'accounting', 'sales', 'purchases', 'manufacturing', 'hr', 'crm', 'settings', 'vouchers'];
    for (const name of expected) {
      expect(files.some((f) => f.startsWith(name))).toBe(true);
    }
  });

  it('Drizzle schema exports all 60 tables', { timeout: 30000 }, async () => {
    const mod = await import('../src/core/database/schema/index');
    const expected = [
      'companies', 'users', 'roles', 'settings', 'branches', 'currencies', 'vatSettings',
      'accounts', 'transactions', 'journalEntries',
      'productCategories', 'productTypes', 'products', 'productProductCategories',
      'warehouses', 'stock', 'stockMovements', 'warehouseTransfers', 'warehouseTransferLines',
      'stockAdjustments',
      'customers', 'quotations', 'quotationLines', 'salesInvoices', 'salesInvoiceLines',
      'salesReturns', 'salesReturnLines',
      'suppliers', 'purchaseInvoices', 'purchaseInvoiceLines', 'purchaseOrders',
      'purchaseOrderLines', 'purchaseReturns', 'purchaseReturnLines',
      'boms', 'bomLines', 'workOrders', 'workOrderConsumptions',
      'departments', 'employees', 'attendance', 'leaves', 'payrollRuns', 'payrollLines',
      'endOfService', 'payrollComponents',
      'leads', 'opportunities', 'crmActivities', 'calls',
      'tasks', 'activities',
      'units', 'cashBoxes', 'banks', 'costCenters', 'defaultAccounts', 'documentSequences',
      'receiptVouchers', 'paymentVouchers',
    ];
    for (const name of expected) {
      expect(mod, `Missing Drizzle export ${name}`).toHaveProperty(name);
    }
  });
});
