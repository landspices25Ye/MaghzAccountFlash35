import { pgTable, uuid, varchar, text, timestamp, numeric, boolean } from 'drizzle-orm/pg-core';
import { companies } from './core';

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = pgTable('products', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar('code', { length: 50 }).notNull(),
  nameAr: varchar('name_ar', { length: 255 }).notNull(),
  nameEn: varchar('name_en', { length: 255 }),
  barcode: varchar('barcode', { length: 100 }),
  sku: varchar('sku', { length: 100 }),
  unit: varchar('unit', { length: 50 }).notNull().default('piece'),
  categoryId: uuid('category_id'),
  costPrice: numeric('cost_price', { precision: 18, scale: 4 }).notNull().default('0'),
  salePrice: numeric('sale_price', { precision: 18, scale: 4 }).notNull().default('0'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Product Categories ───────────────────────────────────────────────────────
export const productCategories = pgTable('product_categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: uuid('parent_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Warehouses ───────────────────────────────────────────────────────────────
export const warehouses = pgTable('warehouses', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  code: varchar('code', { length: 20 }),
  branchId: uuid('branch_id'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Stock (Inventory Quantities) ─────────────────────────────────────────────
export const stock = pgTable('stock', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull().default('0'),
  minStockAlert: numeric('min_stock_alert', { precision: 18, scale: 4 }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Stock Movements ──────────────────────────────────────────────────────────
export const stockMovements = pgTable('stock_movements', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  warehouseId: uuid('warehouse_id').notNull(),
  type: varchar('type', { length: 20 }).notNull(), // in, out, transfer
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
  reference: varchar('reference', { length: 100 }), // invoice_id, transfer_id, etc.
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Warehouse Transfers ──────────────────────────────────────────────────────
export const warehouseTransfers = pgTable('warehouse_transfers', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  fromWarehouseId: uuid('from_warehouse_id').notNull(),
  toWarehouseId: uuid('to_warehouse_id').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // pending, completed, cancelled
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const warehouseTransferLines = pgTable('warehouse_transfer_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  transferId: uuid('transfer_id').notNull().references(() => warehouseTransfers.id, { onDelete: 'cascade' }),
  productId: uuid('product_id').notNull(),
  quantity: numeric('quantity', { precision: 18, scale: 4 }).notNull(),
});
