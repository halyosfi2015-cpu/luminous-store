-- ============================================================================
-- Luminous Derma — Product Alternatives Migration
-- "نسخة من المنتج" = admin enters a price only
-- "بديل من نفس العائلة" = admin selects a product from catalog
-- ============================================================================

CREATE TABLE IF NOT EXISTS product_alternatives (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_product_id       UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  copy_price              NUMERIC,
  family_alternative_id   UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_no_self_family CHECK (family_alternative_id IS NULL OR family_alternative_id <> source_product_id),
  CONSTRAINT uq_source UNIQUE (source_product_id)
);

CREATE INDEX IF NOT EXISTS idx_product_alternatives_source ON product_alternatives (source_product_id);

CREATE TRIGGER trg_product_alternatives_updated_at
  BEFORE UPDATE ON product_alternatives
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
