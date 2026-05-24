import { pgTable, uuid, varchar, text, timestamp, numeric, boolean, date } from 'drizzle-orm/pg-core';
import { companies } from './core';

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliers = pgTable('suppliers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }),
  name: varchar('name', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  taxNumber: varchar('tax_number', { length: 50 }),
  balance: numeric('balance', { precision: 18, scale: 4 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Purchase Invoices ────────────────────────────────────────────────────────
export const purchaseInvoices = pgTable('purchase_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull(),
  supplierId: uuid('supplier_id').notNull(),
  date: date('date').notNull(),
  dueDate: date('due_date'),
  subtotal: numeric('subtotal', { precision: 18, scale: 4 }).notNull().default('0'),
  discountAmount: numeric('discount_amount', { precision: 18, scale: 4 }).default('0'),
  vatAmount: numeric('vat_amount', { precision: 18, scale: 4 }).default('0'),
  totalAmount: numeric('total_amount', { precision: 18, scale: 4 }).notNull().default('0'),
  paidAmount: numeric('paid_amount', { precision: 18, scale: 4 }).default('0'),
  status: varchar('status', { length: 20 }).default('draft'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Purchase Invoice Lines ───────────────────────────────────────────────────
export const purchaseInvoiceLines = pgTable('purchase_invoice_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => purchaseInvoices.id, { onDelete: 'cascade' }),
  productId: uuid('product_id'),
  description: text('description'),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
  lineTotal: numeric('line_total', { precision: 18, scale: 4 }).notNull(),
});

// ─── Purchase Orders ──────────────────────────────────────────────────────────
export const purchaseOrders = pgTable('purchase_orders', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull(),
  supplierId: uuid('supplier_id').notNull(),
  date: date('date').notNull(),
  expectedDate: date('expected_date'),
  totalAmount: numeric('total_amount', { precision: 18, scale: 4 }).notNull().default('0'),
  status: varchar('status', { length: 20 }).default('draft'), // draft, sent, partially_received, received, cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const purchaseOrderLines = pgTable('purchase_order_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  orderId: uuid('order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 18, scale: 4 }).notNull(),
  lineTotal: numeric('line_total', { precision: 18, scale: 4 }).notNull(),
});
