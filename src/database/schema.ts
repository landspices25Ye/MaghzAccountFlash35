import { pgTable, uuid, varchar, char, text, date, timestamp, boolean, numeric } from 'drizzle-orm/pg-core';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';

// Companies Table
export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  currency: char('currency', { length: 3 }).default('YER').notNull(),
  taxNumber: varchar('tax_number', { length: 50 }),
  address: text('address'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  logoUrl: text('logo_url'),
  fiscalYearStart: date('fiscal_year_start'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Users Table
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  username: varchar('username', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }),
  role: varchar('role', { length: 50 }).default('accountant').notNull(),
  passwordHash: text('password_hash'),
  isActive: boolean('is_active').default(true).notNull(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Accounts (Chart of Accounts) Table
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 20 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id, { onDelete: 'restrict' }),
  type: varchar('type', { length: 20 }).notNull(), // asset, liability, equity, revenue, expense
  nature: varchar('nature', { length: 10 }).notNull(), // debit, credit
  isGroup: boolean('is_group').default(false).notNull(),
  balance: numeric('balance', { precision: 18, scale: 4 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 50 }),
  userName: varchar('user_name', { length: 100 }),
  action: text('action').notNull(),
  module: varchar('module', { length: 100 }),
  details: text('details'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// Products Table
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  barcode: varchar('barcode', { length: 100 }),
  sku: varchar('sku', { length: 100 }),
  unit: varchar('unit', { length: 50 }).default('قطعة').notNull(),
  costPrice: numeric('cost_price', { precision: 18, scale: 4 }).default('0').notNull(),
  salePrice: numeric('sale_price', { precision: 18, scale: 4 }).default('0').notNull(),
  stockQty: numeric('stock_qty', { precision: 18, scale: 4 }).default('0').notNull(),
  minStockAlert: numeric('min_stock_alert', { precision: 18, scale: 4 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Contacts (Customers & Vendors) Table
export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 20 }).notNull(), // customer, vendor, both
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  taxNumber: varchar('tax_number', { length: 50 }),
  balance: numeric('balance', { precision: 18, scale: 4 }).default('0').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Transactions (Journal Header) Table
export const transactions = pgTable('transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  reference: varchar('reference', { length: 100 }),
  description: text('description'),
  totalAmount: numeric('total_amount', { precision: 18, scale: 4 }).default('0').notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  status: varchar('status', { length: 20 }).default('draft').notNull(), // draft, posted, cancelled
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Journal Entries Table
export const journalEntries = pgTable('journal_entries', {
  id: uuid('id').defaultRandom().primaryKey(),
  transactionId: uuid('transaction_id').references(() => transactions.id, { onDelete: 'cascade' }),
  accountId: uuid('account_id').references(() => accounts.id, { onDelete: 'restrict' }),
  debit: numeric('debit', { precision: 18, scale: 4 }).default('0').notNull(),
  credit: numeric('credit', { precision: 18, scale: 4 }).default('0').notNull(),
  memo: text('memo'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
