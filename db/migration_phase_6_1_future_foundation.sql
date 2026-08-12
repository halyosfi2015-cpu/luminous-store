-- ============================================================================
-- Phase 6.1 — Future Foundation Migration (additive, reversible)
-- Luminous Derma — Supabase PostgreSQL
-- ----------------------------------------------------------------------------
-- Purpose: Foundation layer for future phases (Analytics, Personalization,
--          Campaigns, AI-driven systems). No data is migrated. No existing
--          table/column/policy is modified.
-- ----------------------------------------------------------------------------
-- Sections:
--   1. Commerce        (covered by existing 30 tables — no new tables)
--   2. Customer        (customer_profiles)
--   3. Analytics       (customer_events)
--   4. AI Readiness    (customer_segments, customer_segment_members,
--                       personalization_rules, recommendations,
--                       purchase_intent_signals)
--   5. Campaigns       (campaigns, campaign_messages)
-- ----------------------------------------------------------------------------
-- Table creation order respects FK dependencies:
--   customers / products / categories / admin_users  (existing)
--     → customer_profiles
--     → customer_events
--     → customer_segments
--       → customer_segment_members
--       → campaigns → campaign_messages
--     → personalization_rules
--     → recommendations
--     → purchase_intent_signals
-- ----------------------------------------------------------------------------
-- Guarantees:
--   - Every CREATE uses IF NOT EXISTS
--   - Every policy is wrapped in DROP POLICY IF EXISTS + CREATE POLICY
--   - Every trigger is wrapped in DROP TRIGGER IF EXISTS + CREATE TRIGGER
--   - No UPDATE/DELETE statements; nothing destructive
-- ============================================================================

-- ============================================================================
-- SECTION 1: Commerce
-- ----------------------------------------------------------------------------
-- The existing 30-table schema already covers Commerce (products, brands,
-- categories, orders, order_items, coupons, reviews, banners, gift_options,
-- hero_campaigns, etc.). No new tables are introduced here.
-- ============================================================================

-- ============================================================================
-- SECTION 2: Customer
-- ============================================================================

-- 2.1: customer_profiles --------------------------------------------------
-- One-to-one extension of customers. Holds preference + aggregate signals
-- that downstream systems (recommendations, personalization, campaigns)
-- will read.

CREATE TABLE IF NOT EXISTS customer_profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id           UUID NOT NULL UNIQUE REFERENCES customers(id) ON DELETE CASCADE,
  preferred_language    TEXT DEFAULT 'ar' CHECK (preferred_language IN ('ar','en')),
  preferred_currency    TEXT DEFAULT 'YER',
  skin_type             TEXT CHECK (skin_type IS NULL OR skin_type IN ('dry','oily','combination','sensitive','normal','mature')),
  skin_concerns         JSONB DEFAULT '[]'::JSONB,
  birth_date            DATE,
  gender                TEXT CHECK (gender IS NULL OR gender IN ('female','male','other','prefer_not_to_say')),
  marketing_opt_in      BOOLEAN DEFAULT false,
  sms_opt_in            BOOLEAN DEFAULT false,
  email_opt_in          BOOLEAN DEFAULT false,
  last_active_at        TIMESTAMPTZ,
  lifetime_value        INT DEFAULT 0,
  total_orders          INT DEFAULT 0,
  total_spent           INT DEFAULT 0,
  preferences           JSONB DEFAULT '{}'::JSONB,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_profiles_customer  ON customer_profiles (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_profiles_last_seen ON customer_profiles (last_active_at);

-- ============================================================================
-- SECTION 3: Analytics / Events
-- ============================================================================

-- 3.1: customer_events ----------------------------------------------------
-- Append-only event log. customer_id is nullable to allow anonymous events.
-- session_id is a free UUID (does not require a separate sessions table at
-- this stage — a single events table is enough for the foundation layer).

CREATE TABLE IF NOT EXISTS customer_events (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id    UUID,
  event_type    TEXT NOT NULL,
  event_name    TEXT,
  entity_type   TEXT,
  entity_id     UUID,
  properties    JSONB DEFAULT '{}'::JSONB,
  user_agent    TEXT,
  ip_address    INET,
  referrer      TEXT,
  source        TEXT DEFAULT 'web' CHECK (source IN ('web','mobile','admin','api','system')),
  occurred_at   TIMESTAMPTZ DEFAULT now(),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_events_customer   ON customer_events (customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_session    ON customer_events (session_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_type       ON customer_events (event_type);
CREATE INDEX IF NOT EXISTS idx_customer_events_entity     ON customer_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_customer_events_occurred   ON customer_events (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_customer_events_type_time  ON customer_events (event_type, occurred_at DESC);

-- ============================================================================
-- SECTION 4: AI Readiness
-- ----------------------------------------------------------------------------
-- Created before campaigns because campaigns.target_segment_id references
-- customer_segments.
-- ============================================================================

-- 4.1: customer_segments --------------------------------------------------
-- Logical groupings of customers. `rules` is a JSONB predicate (e.g.
-- {"skin_type":"oily","min_orders":3}). `is_dynamic=true` means the segment
-- is evaluated on read; otherwise it is maintained manually via
-- customer_segment_members.

CREATE TABLE IF NOT EXISTS customer_segments (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  name          JSONB NOT NULL,
  description   JSONB DEFAULT '{}'::JSONB,
  rules         JSONB DEFAULT '{}'::JSONB,
  is_dynamic    BOOLEAN DEFAULT true,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_segments_slug    ON customer_segments (slug);
CREATE INDEX IF NOT EXISTS idx_customer_segments_active  ON customer_segments (is_active);

-- 4.2: customer_segment_members -------------------------------------------
-- M:N bridge. Used both for static (manual) segments and for cached
-- evaluations of dynamic segments.

CREATE TABLE IF NOT EXISTS customer_segment_members (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  segment_id    UUID NOT NULL REFERENCES customer_segments(id) ON DELETE CASCADE,
  assigned_at   TIMESTAMPTZ DEFAULT now(),
  assigned_by   TEXT DEFAULT 'rule' CHECK (assigned_by IN ('rule','manual','import','ai')),
  score         DECIMAL(5,2) DEFAULT 0,
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_customer_segment_members UNIQUE (customer_id, segment_id)
);

CREATE INDEX IF NOT EXISTS idx_segment_members_customer  ON customer_segment_members (customer_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_segment   ON customer_segment_members (segment_id);
CREATE INDEX IF NOT EXISTS idx_segment_members_expires  ON customer_segment_members (expires_at);

-- 4.3: personalization_rules ----------------------------------------------
-- Declarative rules used by the personalization engine to override or bias
-- content (e.g., "if skin_type=oily and total_orders>=2, boost cleansing
-- products on the homepage"). Stored as structured JSONB so the engine can
-- compile them without DDL changes.

CREATE TABLE IF NOT EXISTS personalization_rules (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug          TEXT UNIQUE NOT NULL,
  name          JSONB NOT NULL,
  description   JSONB DEFAULT '{}'::JSONB,
  context       TEXT NOT NULL CHECK (context IN ('homepage','product_page','category_page','cart','checkout','search','recommendation')),
  priority      INT DEFAULT 100,
  conditions    JSONB DEFAULT '{}'::JSONB,
  actions       JSONB DEFAULT '{}'::JSONB,
  is_active     BOOLEAN DEFAULT true,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personalization_slug      ON personalization_rules (slug);
CREATE INDEX IF NOT EXISTS idx_personalization_context   ON personalization_rules (context);
CREATE INDEX IF NOT EXISTS idx_personalization_priority  ON personalization_rules (priority DESC);
CREATE INDEX IF NOT EXISTS idx_personalization_active    ON personalization_rules (is_active, context);

-- 4.4: recommendations ----------------------------------------------------
-- Pre-computed (or live) product recommendations per customer per context.
-- Lifecycle fields (shown_at, clicked_at, purchased_at) are not updated by
-- an updated_at trigger — they are event markers.

CREATE TABLE IF NOT EXISTS recommendations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  context         TEXT NOT NULL CHECK (context IN ('homepage','product_detail','cart','category','search','abandoned_cart','manual')),
  algorithm       TEXT DEFAULT 'hybrid' CHECK (algorithm IN ('collaborative','content_based','popularity','trending','hybrid','manual')),
  score           DECIMAL(5,4) DEFAULT 0,
  reason          TEXT,
  position        INT,
  expires_at      TIMESTAMPTZ,
  shown_at        TIMESTAMPTZ,
  clicked_at      TIMESTAMPTZ,
  purchased_at    TIMESTAMPTZ,
  metadata        JSONB DEFAULT '{}'::JSONB,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_customer  ON recommendations (customer_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_product   ON recommendations (product_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_context   ON recommendations (context);
CREATE INDEX IF NOT EXISTS idx_recommendations_score     ON recommendations (score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_expires   ON recommendations (expires_at);
CREATE INDEX IF NOT EXISTS idx_recommendations_active    ON recommendations (customer_id, context, expires_at);

-- 4.5: purchase_intent_signals --------------------------------------------
-- Aggregated behavioral signals that indicate a customer's likelihood to
-- purchase. Append-only. Used as input to the recommendation engine and for
-- downstream campaign targeting.

CREATE TABLE IF NOT EXISTS purchase_intent_signals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  session_id      UUID,
  product_id      UUID REFERENCES products(id) ON DELETE SET NULL,
  category_id     UUID REFERENCES categories(id) ON DELETE SET NULL,
  signal_type     TEXT NOT NULL CHECK (signal_type IN ('high_engagement','repeat_visitor','cart_abandon','browse_depth','dwell_time','search_pattern','price_sensitivity','wishlist_add')),
  score           DECIMAL(5,2) DEFAULT 0,
  weight          DECIMAL(5,2) DEFAULT 1.0,
  context         JSONB DEFAULT '{}'::JSONB,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intent_customer  ON purchase_intent_signals (customer_id);
CREATE INDEX IF NOT EXISTS idx_intent_session   ON purchase_intent_signals (session_id);
CREATE INDEX IF NOT EXISTS idx_intent_product   ON purchase_intent_signals (product_id);
CREATE INDEX IF NOT EXISTS idx_intent_category  ON purchase_intent_signals (category_id);
CREATE INDEX IF NOT EXISTS idx_intent_type      ON purchase_intent_signals (signal_type);
CREATE INDEX IF NOT EXISTS idx_intent_score     ON purchase_intent_signals (score DESC);
CREATE INDEX IF NOT EXISTS idx_intent_expires   ON purchase_intent_signals (expires_at);
CREATE INDEX IF NOT EXISTS idx_intent_created   ON purchase_intent_signals (created_at DESC);

-- ============================================================================
-- SECTION 5: Campaigns
-- ----------------------------------------------------------------------------
-- Created last because campaigns.target_segment_id references customer_segments
-- and campaigns.created_by references admin_users.
-- ============================================================================

-- 5.1: campaigns ----------------------------------------------------------
-- Marketing campaign definition. Targets either a saved segment
-- (customer_segments) or an ad-hoc rule (target_rule JSONB).

CREATE TABLE IF NOT EXISTS campaigns (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                TEXT UNIQUE NOT NULL,
  name                JSONB NOT NULL,
  description         JSONB DEFAULT '{}'::JSONB,
  type                TEXT NOT NULL CHECK (type IN ('email','sms','push','newsletter','in_app')),
  status              TEXT DEFAULT 'draft' CHECK (status IN ('draft','scheduled','running','paused','completed','cancelled')),
  target_segment_id   UUID REFERENCES customer_segments(id) ON DELETE SET NULL,
  target_rule         JSONB DEFAULT '{}'::JSONB,
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  budget              INT DEFAULT 0,
  spent               INT DEFAULT 0,
  metadata            JSONB DEFAULT '{}'::JSONB,
  created_by          UUID REFERENCES admin_users(id) ON DELETE SET NULL,
  is_active           BOOLEAN DEFAULT true,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_slug       ON campaigns (slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_status     ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_type       ON campaigns (type);
CREATE INDEX IF NOT EXISTS idx_campaigns_segment    ON campaigns (target_segment_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_starts_at  ON campaigns (starts_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_active     ON campaigns (is_active, status);

-- 5.2: campaign_messages --------------------------------------------------
-- Per-recipient dispatch log. Status lifecycle tracks delivery from a
-- downstream provider (email/sms/push).

CREATE TABLE IF NOT EXISTS campaign_messages (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id           UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id           UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  channel               TEXT NOT NULL CHECK (channel IN ('email','sms','push','in_app')),
  subject               TEXT,
  body                  TEXT,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','queued','sent','delivered','opened','clicked','bounced','failed','unsubscribed')),
  provider_message_id   TEXT,
  sent_at               TIMESTAMPTZ,
  delivered_at          TIMESTAMPTZ,
  opened_at             TIMESTAMPTZ,
  clicked_at            TIMESTAMPTZ,
  error                 TEXT,
  metadata              JSONB DEFAULT '{}'::JSONB,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaign_messages_campaign ON campaign_messages (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_customer ON campaign_messages (customer_id);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_status   ON campaign_messages (status);
CREATE INDEX IF NOT EXISTS idx_campaign_messages_sent_at  ON campaign_messages (sent_at DESC);

-- ============================================================================
-- SECTION 6: Row Level Security
-- ----------------------------------------------------------------------------
-- Strategy:
--   - customer_profiles / customer_events / customer_segment_members /
--     recommendations / purchase_intent_signals: customer owns own rows,
--     admin has full access.
--   - customer_segments / campaigns / personalization_rules: public SELECT
--     for active rows, admin full access.
--   - campaign_messages: customer owns own messages, admin full access.
-- Policies are wrapped in DROP+CREATE for safe re-execution.
-- ============================================================================

ALTER TABLE customer_profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns                ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_segment_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE personalization_rules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_intent_signals  ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 6.1: customer_profiles — customer owns own row, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Customer read own profile"   ON customer_profiles;
DROP POLICY IF EXISTS "Customer insert own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Customer update own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Customer delete own profile" ON customer_profiles;
DROP POLICY IF EXISTS "Admin full access profiles"  ON customer_profiles;

CREATE POLICY "Customer read own profile" ON customer_profiles
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Customer insert own profile" ON customer_profiles
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Customer update own profile" ON customer_profiles
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  ) WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Customer delete own profile" ON customer_profiles
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admin full access profiles" ON customer_profiles
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.2: customer_events — anon INSERT allowed (tracking), customer SELECT own,
--                            admin full access. Anonymous events (customer_id
--                            IS NULL) are visible only to admin.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Anon insert events"          ON customer_events;
DROP POLICY IF EXISTS "Customer read own events"    ON customer_events;
DROP POLICY IF EXISTS "Admin full access events"    ON customer_events;

CREATE POLICY "Anon insert events" ON customer_events
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Customer read own events" ON customer_events
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admin full access events" ON customer_events
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.3: customer_segments — public SELECT active, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read active segments" ON customer_segments;
DROP POLICY IF EXISTS "Admin full access segments"  ON customer_segments;

CREATE POLICY "Public read active segments" ON customer_segments
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access segments" ON customer_segments
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.4: customer_segment_members — customer owns own membership, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Customer read own segment membership"   ON customer_segment_members;
DROP POLICY IF EXISTS "Customer delete own segment membership" ON customer_segment_members;
DROP POLICY IF EXISTS "Admin full access segment members"      ON customer_segment_members;

CREATE POLICY "Customer read own segment membership" ON customer_segment_members
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Customer delete own segment membership" ON customer_segment_members
  FOR DELETE USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admin full access segment members" ON customer_segment_members
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.5: campaigns — public SELECT active, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read active campaigns" ON campaigns;
DROP POLICY IF EXISTS "Admin full access campaigns"  ON campaigns;

CREATE POLICY "Public read active campaigns" ON campaigns
  FOR SELECT USING (is_active = true AND status IN ('scheduled','running'));

CREATE POLICY "Admin full access campaigns" ON campaigns
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.6: campaign_messages — customer owns own messages, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Customer read own campaign messages" ON campaign_messages;
DROP POLICY IF EXISTS "Admin full access campaign messages" ON campaign_messages;

CREATE POLICY "Customer read own campaign messages" ON campaign_messages
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admin full access campaign messages" ON campaign_messages
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.7: personalization_rules — public SELECT active, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read active personalization" ON personalization_rules;
DROP POLICY IF EXISTS "Admin full access personalization"  ON personalization_rules;

CREATE POLICY "Public read active personalization" ON personalization_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admin full access personalization" ON personalization_rules
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.8: recommendations — customer owns own (when customer_id is set); public
--                            rows (customer_id NULL) are read-only to public;
--                            admin full access.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Public read anonymous recommendations" ON recommendations;
DROP POLICY IF EXISTS "Customer read own recommendations"     ON recommendations;
DROP POLICY IF EXISTS "Admin full access recommendations"     ON recommendations;

CREATE POLICY "Public read anonymous recommendations" ON recommendations
  FOR SELECT USING (customer_id IS NULL AND (expires_at IS NULL OR expires_at > now()));

CREATE POLICY "Customer read own recommendations" ON recommendations
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admin full access recommendations" ON recommendations
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ----------------------------------------------------------------------------
-- 6.9: purchase_intent_signals — customer owns own, admin full access
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Customer read own intent signals" ON purchase_intent_signals;
DROP POLICY IF EXISTS "Admin full access intent signals" ON purchase_intent_signals;

CREATE POLICY "Customer read own intent signals" ON purchase_intent_signals
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE auth_id = auth.uid())
  );

CREATE POLICY "Admin full access intent signals" ON purchase_intent_signals
  USING (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true))
  WITH CHECK (EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true));

-- ============================================================================
-- SECTION 7: updated_at Triggers
-- ----------------------------------------------------------------------------
-- Apply the existing update_updated_at() function (created in schema.sql) to
-- every new table that has an updated_at column. Each CREATE TRIGGER is
-- guarded with a DROP TRIGGER IF EXISTS so the migration is idempotent.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_customer_profiles_updated_at       ON customer_profiles;
CREATE TRIGGER trg_customer_profiles_updated_at BEFORE UPDATE ON customer_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_campaigns_updated_at               ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_campaign_messages_updated_at       ON campaign_messages;
CREATE TRIGGER trg_campaign_messages_updated_at BEFORE UPDATE ON campaign_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_customer_segments_updated_at       ON customer_segments;
CREATE TRIGGER trg_customer_segments_updated_at BEFORE UPDATE ON customer_segments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_personalization_rules_updated_at   ON personalization_rules;
CREATE TRIGGER trg_personalization_rules_updated_at BEFORE UPDATE ON personalization_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- END — Phase 6.1 Future Foundation Migration
-- ============================================================================
