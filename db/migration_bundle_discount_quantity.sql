-- Migration: Add discount_enabled, discount_percent to bundles and quantity to bundle_products
-- These columns are referenced in code but never created in the DB

ALTER TABLE bundles ADD COLUMN IF NOT EXISTS discount_enabled BOOLEAN DEFAULT true;
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS discount_percent NUMERIC DEFAULT 20;
ALTER TABLE bundle_products ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1 CHECK (quantity > 0);
