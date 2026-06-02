-- Migration: Link products to product types and many-to-many categories
-- This migration adds proper relational structure for product categorization

-- 1. Add product_type_id column to products
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "product_type_id" uuid REFERENCES "product_types"("id") ON DELETE SET NULL;

-- 2. Create many-to-many join table for product <-> categories
CREATE TABLE IF NOT EXISTS "product_product_categories" (
  "product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
  "category_id" uuid NOT NULL REFERENCES "product_categories"("id") ON DELETE CASCADE,
  PRIMARY KEY ("product_id", "category_id")
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS "idx_products_product_type_id" ON "products" ("company_id", "product_type_id");
CREATE INDEX IF NOT EXISTS "idx_ppc_product_id" ON "product_product_categories" ("product_id");
CREATE INDEX IF NOT EXISTS "idx_ppc_category_id" ON "product_product_categories" ("category_id");
