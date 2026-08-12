-- ============================================================================
-- Luminous Derma — Complete PostgreSQL DDL (Supabase-hosted)
-- Auto-generated from TypeScript type definitions in the project.
-- ============================================================================

-- ============================================================================
-- SECTION 1: Extensions & Helpers
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Trigger function: automatically set updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SECTION 2: Core Catalog Tables
-- ============================================================================

-- 2.1: Categories ------------------------------------------------------------
-- Source: src/types/category.ts (Category) + src/types/product.ts (CategoryInfo)

CREATE TABLE IF NOT EXISTS categories (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name            JSONB NOT NULL,             -- {ar, en}
  description     JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  image           TEXT,
  cover_image     TEXT,
  icon            TEXT,
  parent_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  product_count   INT DEFAULT 0,
  sort_order      INT DEFAULT 0,
  seo_metadata    JSONB DEFAULT '{}'::JSONB,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug      ON categories (slug);
CREATE INDEX IF NOT EXISTS idx_categories_parent    ON categories (parent_category_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_active ON categories (is_active);

-- 2.2: Brands -----------------------------------------------------------------
-- Source: types/content.ts (Brand)

CREATE TABLE IF NOT EXISTS brands (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name            TEXT NOT NULL,
  name_ar         TEXT NOT NULL,
  logo            TEXT,
  cover_image     TEXT,
  description     TEXT,
  description_ar  TEXT,
  origin          TEXT,
  origin_ar       TEXT,
  is_verified     BOOLEAN DEFAULT false,
  featured        BOOLEAN DEFAULT false,
  product_count   INT DEFAULT 0,
  seo_metadata    JSONB DEFAULT '{}'::JSONB,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brands_slug      ON brands (slug);
CREATE INDEX IF NOT EXISTS idx_brands_featured  ON brands (featured);

-- 2.3: Products ---------------------------------------------------------------
-- Source: src/types/product.ts (Product interface)

CREATE TABLE IF NOT EXISTS products (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id             TEXT UNIQUE,
  slug                  TEXT UNIQUE NOT NULL,
  sku                   TEXT,
  name                  JSONB NOT NULL,          -- {ar, en}
  description           JSONB DEFAULT '{}'::JSONB, -- {ar, en}
  category_id           UUID NOT NULL REFERENCES categories(id),
  brand_id              UUID NOT NULL REFERENCES brands(id),
  pricing               JSONB NOT NULL,          -- {price, originalPrice?, currency}
  discount              INT DEFAULT 0,
  gallery               JSONB DEFAULT '[]'::JSONB,  -- string[]
  images                JSONB DEFAULT '[]'::JSONB,  -- string[]
  ingredients           JSONB DEFAULT '{}'::JSONB,  -- {ar:[], en:[]}
  usage_instructions    JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  how_to_use            JSONB DEFAULT '[]'::JSONB,  -- string[]
  how_to_use_ar         JSONB DEFAULT '[]'::JSONB,  -- string[]
  skin_types            JSONB DEFAULT '[]'::JSONB,  -- SkinType[]
  suitable_for          JSONB DEFAULT '[]'::JSONB,  -- string[]
  skin_concerns         JSONB DEFAULT '[]'::JSONB,  -- SkinConcern[]
  benefits              JSONB DEFAULT '{}'::JSONB,  -- {ar:[], en:[]}
  stock                 INT DEFAULT 0,
  in_stock              BOOLEAN DEFAULT true,
  stock_quantity        INT DEFAULT 0,
  rating                DECIMAL(2,1) DEFAULT 0,
  review_count          INT DEFAULT 0,
  is_featured           BOOLEAN DEFAULT false,
  is_new                BOOLEAN DEFAULT false,
  is_best_seller        BOOLEAN DEFAULT false,
  is_doctor_recommended BOOLEAN DEFAULT false,
  tags                  JSONB DEFAULT '[]'::JSONB,  -- string[]
  seo_metadata          JSONB DEFAULT '{}'::JSONB,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category_id        ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand_id           ON products (brand_id);
CREATE INDEX IF NOT EXISTS idx_products_slug               ON products (slug);
CREATE INDEX IF NOT EXISTS idx_products_legacy_id          ON products (legacy_id);
CREATE INDEX IF NOT EXISTS idx_products_featured_active    ON products (is_featured, is_active);
CREATE INDEX IF NOT EXISTS idx_products_new_active         ON products (is_new, is_active);
CREATE INDEX IF NOT EXISTS idx_products_best_seller        ON products (is_best_seller);
CREATE INDEX IF NOT EXISTS idx_products_tags               ON products USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_products_skin_types         ON products USING GIN (skin_types);
CREATE INDEX IF NOT EXISTS idx_products_skin_concerns      ON products USING GIN (skin_concerns);

-- 2.4: Product Reviews --------------------------------------------------------
-- Source: src/types/product.ts (ProductReview)

CREATE TABLE IF NOT EXISTS reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id      UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_name_ar TEXT,
  avatar          TEXT,
  rating          INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT NOT NULL,
  comment_ar      TEXT,
  review_date     TEXT,                        -- maps to `date` (string)
  is_verified     BOOLEAN DEFAULT false,
  helpful_count   INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews (product_id);

-- 2.5: Routines ---------------------------------------------------------------
-- Source: src/types/product.ts (Routine)
-- NOTE: `type`/`typeAr` reserved words → renamed to `routine_type`/`routine_type_ar`

CREATE TABLE IF NOT EXISTS routines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug              TEXT UNIQUE NOT NULL,
  name              TEXT NOT NULL,
  name_ar           TEXT NOT NULL,
  description       TEXT,
  description_ar    TEXT,
  routine_type      TEXT,                      -- renamed from `type`
  routine_type_ar   TEXT,                      -- renamed from `typeAr`
  routine_level     TEXT CHECK (routine_level IN ('basic','standard','premium')),
  image             TEXT,
  hero_image        TEXT,
  duration          TEXT,
  duration_en       TEXT,
  for_whom          JSONB DEFAULT '[]'::JSONB, -- string[]
  for_whom_en       JSONB DEFAULT '[]'::JSONB, -- string[]
  expected_results  JSONB DEFAULT '[]'::JSONB, -- string[]
  expected_results_en JSONB DEFAULT '[]'::JSONB, -- string[]
  rating            DECIMAL(2,1) DEFAULT 0,
  review_count      INT DEFAULT 0,
  buyers_count      INT DEFAULT 0,
  savings_percent   INT DEFAULT 0,
  display_order     INT DEFAULT 0,
  why_chose_it      TEXT,
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routines_slug       ON routines (slug);
CREATE INDEX IF NOT EXISTS idx_routines_is_active  ON routines (is_active);
CREATE INDEX IF NOT EXISTS idx_routines_display    ON routines (display_order);

-- 2.6: Routine Steps ----------------------------------------------------------
-- Source: src/types/product.ts (RoutineStep)

CREATE TABLE IF NOT EXISTS routine_steps (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  routine_id      UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  step_number     INT NOT NULL,
  title_ar        TEXT NOT NULL,
  title_en        TEXT NOT NULL,
  description_ar  TEXT,
  description_en  TEXT,
  time_of_day     TEXT CHECK (time_of_day IN ('morning','evening','both')),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_routine_steps_routine_id ON routine_steps (routine_id);

-- 2.7: Experts ----------------------------------------------------------------
-- Source: src/types/expert.ts (Expert)
-- NOTE: `specialties`/`specialtiesAr` → `specialties_arr`/`specialties_ar` (avoid keyword conflict)

CREATE TABLE IF NOT EXISTS experts (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                      TEXT UNIQUE NOT NULL,
  name                      TEXT NOT NULL,
  name_ar                   TEXT NOT NULL,
  title                     TEXT,
  title_ar                  TEXT,
  specialty                 TEXT,
  specialty_ar              TEXT,
  bio                       TEXT,
  bio_ar                    TEXT,
  short_bio                 TEXT,
  short_bio_ar              TEXT,
  profile_image             TEXT,
  cover_image               TEXT,
  avatar                    TEXT,
  gender                    TEXT CHECK (gender IN ('male','female')),
  languages                 JSONB DEFAULT '[]'::JSONB,  -- string[]
  consultation_types        JSONB DEFAULT '[]'::JSONB,  -- string[]
  services                  JSONB DEFAULT '[]'::JSONB,  -- string[]
  specialties_arr           JSONB DEFAULT '[]'::JSONB,  -- renamed from `specialties`
  specialties_ar            JSONB DEFAULT '[]'::JSONB,  -- renamed from `specialtiesAr`
  years_of_experience       INT DEFAULT 0,
  is_verified               BOOLEAN DEFAULT false,
  available_for_consultation BOOLEAN DEFAULT true,
  rating                    DECIMAL(2,1) DEFAULT 0,
  review_count              INT DEFAULT 0,
  is_featured               BOOLEAN DEFAULT false,
  city                      TEXT,
  city_ar                   TEXT,
  social_links              JSONB DEFAULT '[]'::JSONB,  -- {platform, url, icon?}[]
  seo_metadata              JSONB DEFAULT '{}'::JSONB,
  is_active                 BOOLEAN DEFAULT true,
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_experts_slug      ON experts (slug);
CREATE INDEX IF NOT EXISTS idx_experts_featured  ON experts (is_featured);

-- 2.8: Articles ---------------------------------------------------------------
-- Source: src/types/article.ts (Article)

CREATE TABLE IF NOT EXISTS articles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  title           TEXT NOT NULL,
  title_ar        TEXT NOT NULL,
  excerpt         TEXT,
  excerpt_ar      TEXT,
  content         TEXT,
  content_ar      TEXT,
  author          TEXT,
  author_ar       TEXT,
  avatar          TEXT,
  category        TEXT,
  category_ar     TEXT,
  cover_image     TEXT,
  publish_date    DATE,
  read_time       INT DEFAULT 0,
  tags            JSONB DEFAULT '[]'::JSONB,  -- string[]
  seo_metadata    JSONB DEFAULT '{}'::JSONB,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_articles_slug       ON articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_category   ON articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_pub_date   ON articles (publish_date);
CREATE INDEX IF NOT EXISTS idx_articles_tags       ON articles USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_articles_is_active  ON articles (is_active);

-- 2.9: Bundles ----------------------------------------------------------------
-- Source: src/types/bundle.ts (Bundle)

CREATE TABLE IF NOT EXISTS bundles (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug            TEXT UNIQUE NOT NULL,
  name_ar         TEXT NOT NULL,
  name_en         TEXT NOT NULL,
  description_ar  TEXT,
  description_en  TEXT,
  occasions       JSONB DEFAULT '[]'::JSONB,  -- BundleOccasion[]
  image           TEXT,
  badge           TEXT,
  badge_ar        TEXT,
  original_price  INT NOT NULL,
  bundle_price    INT NOT NULL,
  savings_percent INT DEFAULT 0,
  gift_wrap       BOOLEAN DEFAULT false,
  gift_wrap_price INT DEFAULT 0,
  gift_card       BOOLEAN DEFAULT false,
  service_price   INT DEFAULT 0,
  placeholder     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bundles_slug       ON bundles (slug);
CREATE INDEX IF NOT EXISTS idx_bundles_is_active  ON bundles (is_active);

-- 2.10: FAQs ------------------------------------------------------------------
-- Source: types/content.ts (FAQ)

CREATE TABLE IF NOT EXISTS faqs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question      JSONB NOT NULL,       -- {ar, en}
  answer        JSONB NOT NULL,       -- {ar, en}
  category      TEXT,
  sort_order    INT DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_faqs_is_active ON faqs (is_active);

-- 2.11: Testimonials ----------------------------------------------------------
-- Source: types/content.ts (Testimonial)

CREATE TABLE IF NOT EXISTS testimonials (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_name   TEXT NOT NULL,
  customer_name_ar TEXT,
  rating          INT CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT NOT NULL,
  comment_ar      TEXT,
  avatar          TEXT,
  title           TEXT,
  title_ar        TEXT,
  is_verified     BOOLEAN DEFAULT false,
  is_featured     BOOLEAN DEFAULT false,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON testimonials (is_featured);

-- 2.12: Governorates ----------------------------------------------------------
-- Source: src/data/shipping.ts (Governorate)

CREATE TABLE IF NOT EXISTS governorates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy_id     TEXT UNIQUE,
  name          TEXT NOT NULL,
  name_en       TEXT NOT NULL,
  fee           INT NOT NULL,
  is_enabled    BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_governorates_legacy_id ON governorates (legacy_id);
CREATE INDEX IF NOT EXISTS idx_governorates_enabled   ON governorates (is_enabled);

-- ============================================================================
-- SECTION 3: Junction Tables (5 tables)
-- ============================================================================

-- 3.1: Bundle <-> Products

CREATE TABLE IF NOT EXISTS bundle_products (
  bundle_id   UUID NOT NULL REFERENCES bundles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (bundle_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_bp_bundle   ON bundle_products (bundle_id);
CREATE INDEX IF NOT EXISTS idx_bp_product  ON bundle_products (product_id);

-- 3.2: Routine <-> Products

CREATE TABLE IF NOT EXISTS routine_products (
  routine_id  UUID NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (routine_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_rp_routine  ON routine_products (routine_id);
CREATE INDEX IF NOT EXISTS idx_rp_product  ON routine_products (product_id);

-- 3.3: Expert <-> Products

CREATE TABLE IF NOT EXISTS expert_products (
  expert_id   UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (expert_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ep_expert   ON expert_products (expert_id);
CREATE INDEX IF NOT EXISTS idx_ep_product  ON expert_products (product_id);

-- 3.4: Expert <-> Articles

CREATE TABLE IF NOT EXISTS expert_articles (
  expert_id   UUID NOT NULL REFERENCES experts(id) ON DELETE CASCADE,
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  UNIQUE (expert_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_ea_expert   ON expert_articles (expert_id);
CREATE INDEX IF NOT EXISTS idx_ea_article  ON expert_articles (article_id);

-- 3.5: Article <-> Products

CREATE TABLE IF NOT EXISTS article_products (
  article_id  UUID NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE (article_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_ap_article  ON article_products (article_id);
CREATE INDEX IF NOT EXISTS idx_ap_product  ON article_products (product_id);

-- ============================================================================
-- SECTION 4: Transactional Tables
-- ============================================================================

-- 4.1: Customers --------------------------------------------------------------
-- Source: types/auth.ts (User)
-- NOTE: auth_id links to Supabase's auth.users table

CREATE TABLE IF NOT EXISTS customers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE,
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers (email);
CREATE INDEX IF NOT EXISTS idx_customers_auth  ON customers (auth_id);

-- 4.2: Addresses --------------------------------------------------------------
-- Source: types/auth.ts (Address)

CREATE TABLE IF NOT EXISTS addresses (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label       TEXT DEFAULT 'Home',
  full_name   TEXT,
  phone       TEXT,
  governorate TEXT,
  city        TEXT,
  district    TEXT,
  street      TEXT,
  building    TEXT,
  details     TEXT,
  is_default  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses (customer_id);

-- 4.3: Coupons ----------------------------------------------------------------
-- Source: src/admin/types.ts (AdminCoupon)

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT UNIQUE NOT NULL,
  description     JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value  INT NOT NULL,
  min_order_value INT DEFAULT 0,
  max_discount    INT,
  usage_limit     INT,
  usage_count     INT DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons (code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons (is_active);

-- 4.4: Orders -----------------------------------------------------------------
-- Source: types/cart.ts (Order)

CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number            TEXT UNIQUE NOT NULL,
  customer_id             UUID REFERENCES customers(id),
  status                  TEXT DEFAULT 'pending'
                          CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled')),
  subtotal                INT NOT NULL,
  shipping_fee            INT DEFAULT 0,
  discount_total          INT DEFAULT 0,
  total                   INT NOT NULL,
  coupon_id               UUID REFERENCES coupons(id),
  shipping_governorate_id UUID REFERENCES governorates(id),
  shipping_address        JSONB NOT NULL,  -- ShippingAddress
  payment_method          TEXT,
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_customer_id  ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status       ON orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders (order_number);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders (created_at);

-- 4.5: Order Items ------------------------------------------------------------
-- Source: types/cart.ts (CartItem) — denormalized for order history

CREATE TABLE IF NOT EXISTS order_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES products(id),
  product_name    TEXT,         -- denormalized
  product_name_ar TEXT,         -- denormalized
  product_image   TEXT,         -- denormalized
  quantity        INT NOT NULL DEFAULT 1,
  unit_price      INT NOT NULL,
  total_price     INT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_items_order   ON order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items (product_id);

-- ============================================================================
-- SECTION 5: Marketing & Config
-- ============================================================================

-- 5.1: Banners ----------------------------------------------------------------
-- Source: src/admin/types.ts (AdminBanner)

CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       JSONB NOT NULL,       -- {ar, en}
  subtitle    JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  image       TEXT,
  image_mobile TEXT,
  link        TEXT,
  position    TEXT,
  is_active   BOOLEAN DEFAULT true,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  sort_order  INT DEFAULT 0,
  created_by  UUID,                 -- references admin_users(id) after that table exists
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_banners_active  ON banners (is_active);
CREATE INDEX IF NOT EXISTS idx_banners_dates   ON banners (starts_at, ends_at);

-- 5.2: Homepage Sections ------------------------------------------------------
-- Source: src/admin/types.ts (HomepageSectionKey, HomepageSettings)

CREATE TABLE IF NOT EXISTS homepage_sections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_key   TEXT UNIQUE NOT NULL,  -- hero, categories, bestSellers, newArrivals, offers, bundles, experts, articles
  title         JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  is_enabled    BOOLEAN DEFAULT true,
  sort_order    INT DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hs_key ON homepage_sections (section_key);

-- 5.3: Offers (Weekly Campaigns) ----------------------------------------------
-- Source: src/engine/types.ts (WeeklyCampaign)

CREATE TABLE IF NOT EXISTS offers (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  month       INT NOT NULL,
  year        INT NOT NULL,
  week        INT NOT NULL CHECK (week >= 1 AND week <= 4),
  products    JSONB DEFAULT '[]'::JSONB,  -- OfferProduct[]
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT true,
  created_by  UUID,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_period  ON offers (year, month, week);
CREATE INDEX IF NOT EXISTS idx_offers_active  ON offers (is_active);

-- 5.4: Hero Campaigns ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS hero_campaigns (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         JSONB NOT NULL,       -- {ar, en}
  subtitle      JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  image         TEXT,
  image_mobile  TEXT,
  cta_text      JSONB DEFAULT '{}'::JSONB,  -- {ar, en}
  cta_link      TEXT,
  is_active     BOOLEAN DEFAULT true,
  starts_at     TIMESTAMPTZ,
  ends_at       TIMESTAMPTZ,
  sort_order    INT DEFAULT 0,
  created_by    UUID,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hero_active ON hero_campaigns (is_active);

-- 5.5: Gift Options -----------------------------------------------------------

CREATE TABLE IF NOT EXISTS gift_options (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        TEXT,                    -- canonical model id (e.g. 'wrap'), symmetric mapping
  name        JSONB NOT NULL,          -- {ar, en}
  description JSONB,                   -- {ar, en}
  price       INT NOT NULL,
  image       TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- SECTION 6: Admin & Auth
-- ============================================================================

-- 6.1: Admin Users ------------------------------------------------------------
-- Source: src/admin/types.ts (AdminRole, AdminSession)

CREATE TABLE IF NOT EXISTS admin_users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id     UUID UNIQUE,            -- FK to auth.users (Supabase) — added later via ALTER
  name        TEXT NOT NULL,
  role        TEXT NOT NULL
              CHECK (role IN ('super_admin','admin','content_manager','product_manager','order_manager','support')),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_auth ON admin_users (auth_id);

-- 6.2: Admin Sessions (optional fallback — Supabase Auth handles primary sessions)
CREATE TABLE IF NOT EXISTS admin_sessions (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id    UUID NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token       TEXT UNIQUE NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions (token);

-- 6.3: Site Settings ----------------------------------------------------------
-- Source: src/types/siteConfig.ts (SiteConfig) — stored as key-value JSONB pairs

CREATE TABLE IF NOT EXISTS site_settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_site_settings_key ON site_settings (key);

-- ============================================================================
-- SECTION 7: Additional Indexes (not defined inline above)
-- ============================================================================

-- Products full-text support (optional — uncomment if needed)
-- CREATE INDEX IF NOT EXISTS idx_products_name_gin ON products USING GIN (name);
-- CREATE INDEX IF NOT EXISTS idx_products_search ON products
--   USING GIN (to_tsvector('english', name->>'en') || to_tsvector('arabic', name->>'ar'));

-- ============================================================================
-- SECTION 8: Row-Level Security (RLS) Policies
-- ============================================================================

-- Every table gets public read + admin full access.
-- Customer-scoped tables get an additional ownership policy.

-- 8.1: Enable RLS on all tables

ALTER TABLE categories         ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE routines           ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_steps      ENABLE ROW LEVEL SECURITY;
ALTER TABLE experts            ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundles            ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs               ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials       ENABLE ROW LEVEL SECURITY;
ALTER TABLE governorates       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_products    ENABLE ROW LEVEL SECURITY;
ALTER TABLE expert_articles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_products   ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses          ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons            ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners            ENABLE ROW LEVEL SECURITY;
ALTER TABLE homepage_sections  ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers             ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_campaigns     ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_options       ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings      ENABLE ROW LEVEL SECURITY;

-- 8.2: Public Read — allows anonymous/public browsing for catalog & content

CREATE POLICY "Public read access" ON categories       FOR SELECT USING (true);
CREATE POLICY "Public read access" ON brands           FOR SELECT USING (true);
CREATE POLICY "Public read access" ON products         FOR SELECT USING (true);
CREATE POLICY "Public read access" ON reviews          FOR SELECT USING (true);
CREATE POLICY "Public read access" ON routines         FOR SELECT USING (true);
CREATE POLICY "Public read access" ON routine_steps    FOR SELECT USING (true);
CREATE POLICY "Public read access" ON experts          FOR SELECT USING (true);
CREATE POLICY "Public read access" ON articles         FOR SELECT USING (true);
CREATE POLICY "Public read access" ON bundles          FOR SELECT USING (true);
CREATE POLICY "Public read access" ON faqs             FOR SELECT USING (true);
CREATE POLICY "Public read access" ON testimonials     FOR SELECT USING (true);
CREATE POLICY "Public read access" ON governorates     FOR SELECT USING (true);
CREATE POLICY "Public read access" ON bundle_products  FOR SELECT USING (true);
CREATE POLICY "Public read access" ON routine_products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON expert_products  FOR SELECT USING (true);
CREATE POLICY "Public read access" ON expert_articles  FOR SELECT USING (true);
CREATE POLICY "Public read access" ON article_products FOR SELECT USING (true);
CREATE POLICY "Public read access" ON gift_options     FOR SELECT USING (true);

-- 8.3: Admin Full Access — grants all operations to active admin users

CREATE POLICY "Admin full access" ON categories USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON brands USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON products USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON reviews USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON routines USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON routine_steps USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON experts USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON articles USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON bundles USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON faqs USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON testimonials USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON governorates USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON bundle_products USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON routine_products USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON expert_products USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON expert_articles USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON article_products USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON banners USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON homepage_sections USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON offers USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON hero_campaigns USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON gift_options USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON admin_users USING (
  coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'service_role'
) WITH CHECK (
  coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'service_role'
);

CREATE POLICY "Admin full access" ON admin_sessions USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON site_settings USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

-- 8.4: Customer-Owned Data — scoped to the authenticated customer

CREATE POLICY "Customer owns data" ON customers FOR SELECT USING (
  auth.uid() = auth_id
);
CREATE POLICY "Customer update own" ON customers FOR UPDATE USING (
  auth.uid() = auth_id
) WITH CHECK (
  auth.uid() = auth_id
);

CREATE POLICY "Customer owns address" ON addresses FOR SELECT USING (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);
CREATE POLICY "Customer insert address" ON addresses FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);
CREATE POLICY "Customer update address" ON addresses FOR UPDATE USING (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
) WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);
CREATE POLICY "Customer delete address" ON addresses FOR DELETE USING (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);

CREATE POLICY "Customer owns orders" ON orders FOR SELECT USING (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);
CREATE POLICY "Customer insert orders" ON orders FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);

CREATE POLICY "Customer owns order_items" ON order_items FOR SELECT USING (
  auth.uid() IN (
    SELECT c.auth_id FROM customers c
    JOIN orders o ON o.customer_id = c.id
    WHERE o.id = order_items.order_id
  )
);
CREATE POLICY "Customer insert order_items" ON order_items FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT c.auth_id FROM customers c
    JOIN orders o ON o.customer_id = c.id
    WHERE o.id = order_items.order_id
  )
);

-- ============================================================================
-- SECTION 9: Triggers (auto-update updated_at)
-- ============================================================================

-- Apply the update_updated_at trigger to every table that has an updated_at column

CREATE TRIGGER trg_categories_updated_at         BEFORE UPDATE ON categories         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_brands_updated_at             BEFORE UPDATE ON brands             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_products_updated_at           BEFORE UPDATE ON products           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_routines_updated_at           BEFORE UPDATE ON routines           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_experts_updated_at            BEFORE UPDATE ON experts            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_articles_updated_at           BEFORE UPDATE ON articles           FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_bundles_updated_at            BEFORE UPDATE ON bundles            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_governorates_updated_at       BEFORE UPDATE ON governorates        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_customers_updated_at          BEFORE UPDATE ON customers          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_coupons_updated_at            BEFORE UPDATE ON coupons            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_orders_updated_at             BEFORE UPDATE ON orders             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_banners_updated_at            BEFORE UPDATE ON banners            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_homepage_sections_updated_at  BEFORE UPDATE ON homepage_sections  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_offers_updated_at             BEFORE UPDATE ON offers             FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hero_campaigns_updated_at     BEFORE UPDATE ON hero_campaigns     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gift_options_updated_at       BEFORE UPDATE ON gift_options       FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_admin_users_updated_at        BEFORE UPDATE ON admin_users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_site_settings_updated_at      BEFORE UPDATE ON site_settings      FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- DONE. Schema mirrors the EXACT TypeScript types in the Luminous Derma project.
-- ============================================================================
