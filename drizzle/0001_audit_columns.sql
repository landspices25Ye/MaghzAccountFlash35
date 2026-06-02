-- Migration: Add created_by and updated_by to user-owned document tables
-- This migration adds audit columns to track which user created/updated each document

-- Accounting
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "journal_entries" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_accounts_created_by" ON "accounts" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_transactions_created_by" ON "transactions" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_journal_entries_created_by" ON "journal_entries" ("company_id", "created_by");
--> statement-breakpoint

-- Inventory
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "warehouse_transfers" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_products_created_by" ON "products" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_stock_movements_created_by" ON "stock_movements" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_warehouse_transfers_created_by" ON "warehouse_transfers" ("company_id", "created_by");
--> statement-breakpoint

-- Sales
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "quotations" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "sales_returns" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_customers_created_by" ON "customers" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_quotations_created_by" ON "quotations" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_sales_invoices_created_by" ON "sales_invoices" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_sales_returns_created_by" ON "sales_returns" ("company_id", "created_by");
--> statement-breakpoint

-- Purchases
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_invoices" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_returns" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "purchase_returns" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_suppliers_created_by" ON "suppliers" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_purchase_invoices_created_by" ON "purchase_invoices" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_purchase_orders_created_by" ON "purchase_orders" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_purchase_returns_created_by" ON "purchase_returns" ("company_id", "created_by");
--> statement-breakpoint

-- Manufacturing
ALTER TABLE "boms" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "boms" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "work_orders" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_boms_created_by" ON "boms" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_work_orders_created_by" ON "work_orders" ("company_id", "created_by");
--> statement-breakpoint

-- HR
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "attendance" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "leaves" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "payroll_runs" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "payroll_runs" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "end_of_service" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "end_of_service" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_employees_created_by" ON "employees" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_attendance_created_by" ON "attendance" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_leaves_created_by" ON "leaves" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_payroll_runs_created_by" ON "payroll_runs" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_end_of_service_created_by" ON "end_of_service" ("company_id", "created_by");
--> statement-breakpoint

-- CRM
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "opportunities" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "crm_activities" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "created_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "updated_by" uuid REFERENCES "users"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "idx_leads_created_by" ON "leads" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_opportunities_created_by" ON "opportunities" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_crm_activities_created_by" ON "crm_activities" ("company_id", "created_by");
CREATE INDEX IF NOT EXISTS "idx_tasks_created_by" ON "tasks" ("company_id", "created_by");
