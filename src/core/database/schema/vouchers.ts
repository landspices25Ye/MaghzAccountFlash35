import { pgTable, uuid, varchar, text, timestamp, numeric, date } from 'drizzle-orm/pg-core';
import { companies } from './core';

// ─── Receipt Vouchers (قبض) ───────────────────────────────────────────────────
export const receiptVouchers = pgTable('receipt_vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  voucherNumber: varchar('voucher_number', { length: 50 }).notNull(),
  date: date('date').notNull(),
  customerId: uuid('customer_id'),
  amount: numeric('amount', { precision: 18, scale: 4 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('cash'),
  bankAccountId: uuid('bank_account_id'),
  checkNumber: varchar('check_number', { length: 50 }),
  checkDate: date('check_date'),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('draft'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Payment Vouchers (صرف) ───────────────────────────────────────────────────
export const paymentVouchers = pgTable('payment_vouchers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  voucherNumber: varchar('voucher_number', { length: 50 }).notNull(),
  date: date('date').notNull(),
  supplierId: uuid('supplier_id'),
  expenseAccountId: uuid('expense_account_id'),
  amount: numeric('amount', { precision: 18, scale: 4 }).notNull(),
  paymentMethod: varchar('payment_method', { length: 20 }).notNull().default('cash'),
  bankAccountId: uuid('bank_account_id'),
  checkNumber: varchar('check_number', { length: 50 }),
  checkDate: date('check_date'),
  notes: text('notes'),
  status: varchar('status', { length: 20 }).default('draft'),
  createdBy: uuid('created_by'),
  updatedBy: uuid('updated_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
