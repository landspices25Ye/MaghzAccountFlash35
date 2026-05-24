import { pgTable, uuid, varchar, text, timestamp, numeric, boolean, date } from 'drizzle-orm/pg-core';
import { companies } from './core';

// ─── Customers ────────────────────────────────────────────────────────────────
export const customers = pgTable('customers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  taxNumber: varchar('tax_number', { length: 50 }),
  creditLimit: numeric('credit_limit', { precision: 18, scale: 4 }),
  balance: numeric('balance', { precision: 18, scale: 4 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Sales Invoices ───────────────────────────────────────────────────────────
export const salesInvoices = pgTable('sales_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').notNull(),
  date: date('date').notNull(),
  dueDate: date('due_date'),
  subtotal: numeric('subtotal', { precision: 18, scale: 4 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 18, scale: 4 }).default('0'),
  vatAmount: numeric('vat_amount', { precision: 18, scale: 4 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 18, scale: 4 }).notNull().default('0'),
  paidAmount: numeric('paid_amount', { precision: 18, scale: 4 }).default('0'),
  status: varchar('status', { length: 20 }).default('draft'), // draft, posted, paid, partially_paid, cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Sales Invoice Lines ──────────────────────────────────────────────────────
export const salesInvoiceLines = pgTable('sales_invoice_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => salesInvoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
  discountPercent: numeric('discount_percent', { precision: 5, scale: 2 }).default('0'),
  vatPercent: numeric('vat_percent', { precision: 5, scale: 2 }).default('15'),
  lineTotal: numeric('line_total', { precision: 18, scale: 4 }).notNull(),
});

// ─── Quotations ───────────────────────────────────────────────────────────────
export const quotations = pgTable('quotations', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  quotationNumber: varchar('quotation_number', { length: 50 }).notNull(),
  customerId: uuid('customer_id').notNull(),
  date: date('date').notNull(),
  expiryDate: date('expiry_date'),
  totalAmount: numeric('total_amount', { precision: 18, scale: 4 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).default('open'), // open, accepted, rejected, expired
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
