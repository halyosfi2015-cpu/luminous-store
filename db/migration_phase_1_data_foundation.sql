-- ============================================================================
-- PHASE 1 — DATA FOUNDATION MIGRATION
-- ============================================================================
-- This migration addresses findings from the Phase 1 Data Foundation Audit:
-- 1. Missing public read policies for banners, hero_campaigns, offers, homepage_sections
-- 2. Missing audit_log table (referenced in code but not in schema)
-- 3. Missing columns on products table (Phase 7 additions in code)
-- 4. Missing status column on reviews table
-- ============================================================================

-- ============================================================================
-- 1. MISSING RLS PUBLIC READ POLICIES
-- ============================================================================

-- Banners: Homepage banners must be publicly readable for the storefront
DROP POLICY IF EXISTS "Public read access" ON banners;
CREATE POLICY "Public read access" ON banners FOR SELECT USING (true);

-- Hero Campaigns: Homepage hero section must be publicly readable
DROP POLICY IF EXISTS "Public read access" ON hero_campaigns;
CREATE POLICY "Public read access" ON hero_campaigns FOR SELECT USING (true);

-- Offers: Weekly campaign offers must be publicly readable for homepage display
DROP POLICY IF EXISTS "Public read access" ON offers;
CREATE POLICY "Public read access" ON offers FOR SELECT USING (true);

-- Homepage Sections: Section visibility config must be publicly readable
DROP POLICY IF EXISTS "Public read access" ON homepage_sections;
CREATE POLICY "Public read access" ON homepage_sections FOR SELECT USING (true);

-- ============================================================================
-- 2. AUDIT LOG TABLE
-- ============================================================================
-- Referenced in src/lib/admin-supabase.ts (lines 1663, 1690, 1717)
-- Used for admin action audit trail

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor       TEXT NOT NULL,           -- admin name or identifier
  action      TEXT NOT NULL,           -- e.g. "product_created", "order_status_changed"
  entity_type TEXT,                    -- e.g. "product", "order", "coupon"
  entity_id   TEXT,                    -- ID of the affected entity
  details     JSONB DEFAULT '{}'::JSONB, -- additional context
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_actor    ON audit_log (actor);
CREATE INDEX IF NOT EXISTS idx_audit_log_action   ON audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity   ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created  ON audit_log (created_at);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Admin full access for audit_log
DROP POLICY IF EXISTS "Admin full access" ON audit_log;
CREATE POLICY "Admin full access" ON audit_log USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

-- ============================================================================
-- 3. MISSING PRODUCT COLUMNS (Phase 7 additions in code)
-- ============================================================================
-- These columns are referenced in src/lib/admin-supabase.ts supabaseSaveProduct()
-- but not defined in the original schema.sql

ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS base_price INT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_real_discount BOOLEAN DEFAULT false;
ALTER TABLE products ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_aliases JSONB DEFAULT '[]'::JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS duplicate_of TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hero_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS audit JSONB DEFAULT '{}'::JSONB;

-- ============================================================================
-- 4. MISSING REVIEW STATUS COLUMN
-- ============================================================================
-- Referenced in src/lib/admin-supabase.ts supabaseUpdateReviewStatus()

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- ============================================================================
-- 5. BANNER/HERO/OFFERS CREATED_BY FK CONSTRAINTS
-- ============================================================================
-- These columns exist but have no FK constraint

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_banners_created_by'
  ) THEN
    ALTER TABLE banners ADD CONSTRAINT fk_banners_created_by
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_hero_created_by'
  ) THEN
    ALTER TABLE hero_campaigns ADD CONSTRAINT fk_hero_created_by
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_offers_created_by'
  ) THEN
    ALTER TABLE offers ADD CONSTRAINT fk_offers_created_by
      FOREIGN KEY (created_by) REFERENCES admin_users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================================================
-- DONE
-- ============================================================================
