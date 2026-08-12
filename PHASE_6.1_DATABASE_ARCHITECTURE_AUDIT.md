# Phase 6.1 — Database Architecture Audit & Proposal

**Project**: Luminous e-Commerce (Active)  
**Date**: August 2026  
**Status**: Audit Complete — Proposal Ready for Phase 6.2

---

## 1. Audit Summary — Current State

The application operates entirely on in-memory static data and browser localStorage. There is no persistent database, no server, and no authentication backend. All data lives in TypeScript source files or the user's browser, making it inherently single-user and volatile.

### 1.1 Static Data Sources (`src/data/`)

| File | Record Count | Description |
|---|---|---|
| `products.ts` | 354 | Full Product objects (line 49+) |
| `product-summaries.ts` | 438 | Slim ProductSummary records |
| `categories.ts` | 7 | Top-level categories |
| `brands.ts` | 109 | Brand entities |
| `experts.ts` | 8 | Expert profiles |
| `articles.ts` | 8 | Blog / editorial articles |
| `bundles.ts` | 4 | Product bundles |
| `shipping.ts` | 21 | Governorates |
| `faqs.ts` | ~30 | FAQ entries |
| `testimonials.ts` | ~12 | Customer testimonials |
| `bundles-admin.ts` | 4 | Bundles admin storage |
| `experts-admin.ts` | 8 | Experts admin storage |
| `routines-store.ts` | — | Routine merge logic (defaults + custom) |
| `product-compare-details.ts` | — | Comparison data |
| `reviews.ts` | — | Review entries |
| `quiz.ts` | — | Quiz questions |
| `siteConfig.ts` | — | Site configuration |
| `navigation.ts` | — | Admin navigation items |

**Inline Subcategories (products.ts)**: 43 CategoryInfo entries (cleansers, toners, serums, moisturizers, sunscreen, eye-care, lip-care, masks, exfoliators, shampoo, conditioner, hair-oils, body-wash, body-lotion, body-oils, face-makeup, eye-makeup, lip-makeup, perfume-women, perfume-men, perfume-musk, perfume-gift-sets, bakhoor-premium, bakhoor-oud, bakhoor-dehn, bakhoor-burners, bakhoor-charcoal, bakhoor-home, bakhoor-occasions, bakhoor-brides, bakhoor-oils, bakhoor-gift-sets, baby-care, vitamins, collagen, immunity, hair-nails, kids-supplements, women-health, appliances-hair, appliances-shaving, appliances-teeth, tools)

**Routines**: 23 total across 8 types (daily, acne, firming, dryness, brightening, oiliness, sensitivity, eye) with 3 levels (basic, standard, premium).

### 1.2 localStorage Keys (17 Unique)

| Key | Purpose |
|---|---|
| `luminous-banners` | Admin banner data |
| `luminous-coupons` | Admin coupon codes |
| `luminous-homepage-sections` | Homepage section visibility |
| `luminous-orders` | Customer orders |
| `luminous-reviews-overrides` | Admin review status overrides |
| `luminous-offers-engine` | Offers engine configuration |
| `luminous-offers-stats` | Offers engine statistics |
| `luminous-month-{year}-{month}` | Per-month campaign data |
| `luminous-user-signals` | User behavior signals |
| `luminous-rec-config` | Recommendation engine config |
| `luminous-featured-pick` | Featured product pick |
| `luminous-shipping-governorates` | Shipping governorate config |
| `luminous-bundles` | Admin-edited bundle data |
| `luminous-gift-options` | Gift option add-ons |
| `ld-hero-campaign` | Hero section campaign override |
| `luminous-experts` | Admin-edited expert list |
| `luminous-routines-custom` | Admin-customized routines |

**Additional keys**: `luminous-products` (product overrides), `ld-lang` (language preference).

### 1.3 Admin Structure (`src/admin/`)

| Component | Details |
|---|---|
| `AdminDataProvider.tsx` | React context for admin auth/session |
| `types.ts` | 6 roles, 19 resources, 2 permissions (view/edit) |
| `permissions.ts` | Role-based access matrix |
| `navigation.ts` | Admin sidebar nav items |
| `useAdminGuard.ts` | Per-resource access control hook |
| `services/index.ts` | Service layer abstracting adapter calls |
| `adapters/local/` | 19 adapter files |

**Roles** (6): super_admin, admin, content_manager, product_manager, order_manager, support

**Adapter files** (19): index, types, articles, banners, brands, bundles, categories, coupons, customers, experts, hero, homepage, offers, orders, products, reviews, routines, shipping, stats

**Admin Pages** (22): dashboard, hero, banners, products, products/[id], products/new, categories, brands, orders, customers, offers, articles, routines, bundles, experts, coupons, reviews, users, reports, shipping, homepage

---

## 2. Current Entity Relationships

All relationships are string-based references embedded in TypeScript data structures. There is no referential integrity.

### 2.1 Core Entity Map (14 Primary Entities)

| Entity | Cardinality | Reference Via |
|---|---|---|
| Product → Category | N:1 | `categorySlug: string` |
| Product → Brand | N:1 | `brand: string` |
| Product → Reviews | 1:N | Embedded `reviews[]` array |
| Bundle → Products | M:N | `productIds: string[]` |
| Routine → Products | M:N | `products: string[]` |
| Expert → Products | M:N | `products: string[]` |
| Expert → Articles | M:N | `articles: string[]` |
| Article → Expert | N:1 | `author: string` |
| Article → Products | M:N | `relatedProducts: string[]` |
| Article → Category | N:1 | `category: string` |
| Order → Products | M:N | `items: CartItem[]` array |
| Order → ShippingAddress | 1:1 | Embedded address object |
| Order → Coupon | 0..1 | `couponCode: string` |
| Customer → Orders | 1:N | Derived from name+phone match |

**Note**: Customer is derived from order data — there is no standalone customer table. The remaining entities (BundleProduct, RoutineStep, GiftOption, Banner, Governorate, FAQ, Testimonial) bring the total to 21 distinct entity types.

---

## 3. Problem Statement

### 3.1 Structural Issues (11)

1. **Zero Persistence**: All admin writes go to localStorage. A browser clear, private browsing session, or different device loses everything.

2. **localStorage Volatility**: 5–10 MB browser limit. Large product catalogs, order histories, and media URLs will hit constraints.

3. **No Multi-Device Access**: Admin changes made on one machine are invisible on another.

4. **No Server-Side Validation**: Client-side guard hooks can be bypassed. Data integrity relies entirely on frontend code.

5. **No Real Authentication**: "Login" is a simulated client-side toggle. No password hashing, no sessions, no JWT.

6. **No Relational Integrity**: String-based foreign keys (e.g., `categorySlug`, `brand`) have no enforcement. Orphaned references are inevitable.

7. **No Backup or Recovery**: All data resides in a single browser profile. Data loss is permanent and unrecoverable.

8. **No Environment Separation**: The same data serves development and production. No staging or sandbox.

9. **No Audit Trail**: Changes to products, orders, or offers leave no trace of who made them or when.

10. **No Concurrency Control**: Two admin tabs open = last write wins. No locking or conflict detection.

11. **All Data Loaded Client-Side**: The entire catalog, reviews, and bundles load into memory. No pagination, no lazy loading, no query filtering at the data layer.

### 3.2 Business Impact

- **Cannot go live**: Any real customer order data would be unrecoverable.
- **Admin workflow is fictional**: Two team members cannot collaborate on content, orders, or products.
- **No analytics foundation**: Without a real backend, there is no path to reporting, email automation, or CRM integration.
- **Security is absent**: Customer PII (addresses, phone numbers) stored in unencrypted localStorage violates any realistic compliance requirement.

---

## 4. Proposed Architecture — Supabase (PostgreSQL)

### 4.1 Technology Stack

| Layer | Technology |
|---|---|
| Database | PostgreSQL (Supabase managed) |
| API Layer | PostgREST + Row Level Security (RLS) |
| Auth | Supabase Auth (email/password + OAuth) |
| Middleware | Next.js API routes (server-side validation, complex logic) |
| Client SDK | `@supabase/supabase-js` + `@supabase/ssr` |
| Migrations | Supabase CLI / SQL migration files |
| Backup | Supabase automated backups + PITR |

### 4.2 Schema — Tables (30 Total)

**Core Catalog (12 tables)**

| Table | Key Columns | Notes |
|---|---|---|
| `categories` | id, slug, name_jsonb, description_jsonb, image, parent_id, sort_order | 7 rows, self-referencing for subcategories (43) |
| `brands` | id, slug, name, logo_url, description_jsonb, website, country | 109 rows |
| `products` | id, slug, name_jsonb, description_jsonb, category_id (FK), brand_id (FK), price, compare_at_price, cost_price, sku, barcode, inventory_qty, images_jsonb, ingredients_jsonb, how_to_use_jsonb, skin_types[], skin_concerns[], meta_jsonb, is_active, is_featured, created_at, updated_at | 354 full products |
| `experts` | id, slug, name_jsonb, title_jsonb, bio_jsonb, image, credentials_jsonb, social_links_jsonb, seo_metadata_jsonb, is_active | 8 experts |
| `articles` | id, slug, title_jsonb, excerpt_jsonb, content_jsonb, author_id (FK → experts), category_id (FK → categories), image, read_time, published_at, seo_metadata_jsonb, is_published | 8 articles |
| `bundles` | id, slug, name_jsonb, description_jsonb, price, compare_at_price, image, occasion, discount_pct, is_active | 4 bundles |
| `routines` | id, slug, name_jsonb, description_jsonb, type, level, image, is_active | 23 routines |
| `routine_steps` | id, routine_id (FK), product_id (FK), step_order, instructions_jsonb | Routine → products breakdown |
| `reviews` | id, product_id (FK), user_name, rating, title, body, is_verified, status, helpful_count, created_at | Extracted from embedded arrays |
| `faqs` | id, question_jsonb, answer_jsonb, category, sort_order | ~30 entries |
| `testimonials` | id, name_jsonb, role_jsonb, content_jsonb, image, rating, sort_order | ~12 entries |
| `governorates` | id, name, delivery_days, base_fee, free_threshold | 21 governorates |

**Transactional (5 tables)**

| Table | Key Columns | Notes |
|---|---|---|
| `customers` | id, name, email, phone, created_at | Extracted from orders |
| `addresses` | id, customer_id (FK), governorate_id (FK), city, district, street, zip, is_default | 1:N with customers |
| `orders` | id, customer_id (FK), address_id (FK), coupon_id (FK, nullable), subtotal, shipping_fee, discount, total, status, payment_method, notes, created_at, updated_at | Order lifecycle |
| `order_items` | id, order_id (FK), product_id (FK), product_name, price, quantity, total | M:N resolution |
| `coupons` | id, code, type (pct/fixed), value, min_order, max_uses, used_count, starts_at, expires_at, is_active | Admin-created |

**Marketing & Config (5 tables)**

| Table | Key Columns | Notes |
|---|---|---|
| `banners` | id, title_jsonb, subtitle_jsonb, image, link, cta_text, sort_order, is_active | Hero + promo banners |
| `homepage_sections` | id, section_key, is_visible, sort_order | Section visibility toggles |
| `offers` | id, name, type, discount_pct, product_ids_jsonb, category_ids_jsonb, starts_at, expires_at, is_active | Offers engine |
| `hero_campaigns` | id, title_jsonb, subtitle_jsonb, image_desktop, image_mobile, link, is_active | Hero override |
| `gift_options` | id, name_jsonb, price, image, is_active | Gift add-ons |

**Admin & Auth (3 tables)**

| Table | Key Columns | Notes |
|---|---|---|
| `admin_users` | id, email, password_hash, full_name, role, is_active, last_login, created_at | 6 roles |
| `admin_sessions` | id, user_id (FK), token, expires_at, created_at | JWT session tracking |
| `site_settings` | id, key, value_jsonb, updated_by (FK), updated_at | Key-value config |

**Junction Tables — M:N (5 tables)**

| Table | FK1 | FK2 | Notes |
|---|---|---|---|
| `bundle_products` | bundle_id | product_id | Bundle composition |
| `routine_products` | routine_id | product_id | Routine product inclusion |
| `expert_products` | expert_id | product_id | Expert-associated products |
| `expert_articles` | expert_id | article_id | Expert-authored articles |
| `article_products` | article_id | product_id | Article-related products |

### 4.3 Foreign Key Relationship Diagram

```
categories ──┬── products ──┬── reviews
             │              ├── order_items ── orders ── customers ── addresses
             │              ├── bundle_products ── bundles
             │              ├── routine_products ── routines ── routine_steps
             │              ├── expert_products ── experts ── expert_articles ── articles ── article_products
             │              └── (coupons ── orders)
             │
brands ──────┘

admin_users ── admin_sessions
             ── site_settings
```

### 4.4 Security Model

**Row Level Security (RLS)**: Every table enabled with RLS. Policies differentiate between `anon` (public read), `authenticated` (customer), and `admin_*` roles.

**Authentication**: Supabase Auth issues JWTs containing role claims. Admin roles embedded in `app_metadata`. Custom claims middleware refreshes role on each request.

**Authorization Layers**:

1. **Database level**: RLS policies enforce row-level access (e.g., admin_users can UPDATE products; anon can only SELECT active).
2. **API level**: Next.js API routes validate JWT, check role claims, and sanitize payloads before forwarding to PostgREST.
3. **Frontend level**: `useAdminGuard` hook checks client-side role but is cosmetic only — real enforcement is server-side.

**JWT Flow**:
```
Client → Supabase Auth login → JWT returned
Client → Next.js API route → verify JWT, extract role
Next.js → PostgREST (with service_role key + user context) → RLS policy check → PostgreSQL
```

---

## 5. Migration Strategy

### Phase 6.2 — Infrastructure & Schema
- Create Supabase project (free tier → scale as needed)
- Write full DDL migration (30 tables, FKs, indexes, RLS policies)
- Configure Supabase Auth (email/password, OAuth providers)
- Set environment variables in Vercel / .env.local
- Install `@supabase/supabase-js` + `@supabase/ssr`
- Seed initial admin user (super_admin)
- Run verification queries against schema

### Phase 6.3 — Data Seeding
- Extract data from `src/data/*.ts` into JSON seed files
- Normalize embedded data (Product.reviews → separate reviews table)
- Insert categories (7), subcategories (43), brands (109), products (354)
- Insert experts (8), articles (8), bundles (4), routines (23)
- Insert FAQs (~30), testimonials (~12), governorates (21)
- Create junction table rows for all M:N relationships
- Validate referential integrity post-seed

### Phase 6.4 — Admin Adapter Refactor (19 files)
- Create `adapters/supabase/` directory mirroring `adapters/local/`
- Reimplement all 19 adapter files against Supabase client
- Maintain identical interface signatures for zero frontend changes
- Add error handling, loading states, optimistic updates
- Unit test each adapter function

### Phase 6.5 — Frontend Data Fetching
- Replace static imports with Supabase queries
- Add React Query / SWR for caching and revalidation
- Implement pagination for product lists, orders, reviews
- Wire real auth flow (login form → Supabase Auth → JWT → middleware)
- Real-time subscriptions for order status updates

### Phase 6.6 — Security Hardening
- Tune RLS policies per table and per role
- Rate limiting on API routes (Upstash or Vercel Edge)
- Enable PITR backups in Supabase
- Audit logging trigger (created_by, updated_by, timestamps)
- Input sanitization and validation at API layer
- CORS configuration

---

## 6. DDL Outline — Key Tables

```sql
-- Categories (self-referencing for subcategories)
CREATE TABLE categories (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          JSONB NOT NULL,          -- { "en": "...", "ar": "..." }
  description   JSONB,
  image         TEXT,
  parent_id     UUID REFERENCES categories(id),
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Brands
CREATE TABLE brands (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  logo_url      TEXT,
  description   JSONB,
  website       TEXT,
  country       TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Products (core catalog)
CREATE TABLE products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,
  name            JSONB NOT NULL,
  description     JSONB,
  category_id     UUID REFERENCES categories(id),
  brand_id        UUID REFERENCES brands(id),
  price           DECIMAL(10,2) NOT NULL,
  compare_at_price DECIMAL(10,2),
  cost_price      DECIMAL(10,2),
  sku             TEXT,
  barcode         TEXT,
  inventory_qty   INTEGER DEFAULT 0,
  images          JSONB,
  ingredients     JSONB,
  how_to_use      JSONB,
  skin_types      TEXT[],
  skin_concerns   TEXT[],
  meta            JSONB,
  is_active       BOOLEAN DEFAULT true,
  is_featured     BOOLEAN DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Reviews (extracted from embedded arrays)
CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID REFERENCES products(id) ON DELETE CASCADE,
  user_name     TEXT NOT NULL,
  rating        INTEGER CHECK (rating BETWEEN 1 AND 5),
  title         TEXT,
  body          TEXT,
  is_verified   BOOLEAN DEFAULT false,
  status        TEXT DEFAULT 'pending',  -- pending, approved, rejected
  helpful_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Orders
CREATE TABLE orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID REFERENCES customers(id),
  address_id    UUID REFERENCES addresses(id),
  coupon_id     UUID REFERENCES coupons(id),
  subtotal      DECIMAL(10,2) NOT NULL,
  shipping_fee  DECIMAL(10,2) DEFAULT 0,
  discount      DECIMAL(10,2) DEFAULT 0,
  total         DECIMAL(10,2) NOT NULL,
  status        TEXT DEFAULT 'pending',
  payment_method TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Order Items (M:N resolution)
CREATE TABLE order_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES products(id),
  product_name  TEXT NOT NULL,
  price         DECIMAL(10,2) NOT NULL,
  quantity      INTEGER NOT NULL,
  total         DECIMAL(10,2) NOT NULL
);

-- Admin Users
CREATE TABLE admin_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN (
                  'super_admin','admin','content_manager',
                  'product_manager','order_manager','support'
                )),
  is_active     BOOLEAN DEFAULT true,
  last_login    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Offers Engine
CREATE TABLE offers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  type            TEXT NOT NULL,          -- percentage, fixed, bogo
  discount_pct    DECIMAL(5,2),
  product_ids     JSONB,
  category_ids    JSONB,
  starts_at       TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now()
);
```

> **JSONB convention**: All user-facing text fields (name, description, title, content) store bilingual values as `{ "en": "...", "ar": "..." }` to support Arabic/English without requiring separate columns per locale.

---

## 7. Next Steps — Phase 6.2 Deliverables

| # | Deliverable | Description |
|---|---|---|
| 1 | Supabase project creation | New project in Supabase dashboard; note project URL and anon/service keys |
| 2 | Full DDL migration | Single migration file for all 30 tables with FKs, indexes, triggers |
| 3 | RLS baseline | Enable RLS on all tables; create policies for anon/authenticated/admin roles |
| 4 | Supabase Auth setup | Configure email/password provider; disable email confirmation for dev |
| 5 | Environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| 6 | Supabase client + @supabase/ssr | Install packages; create `src/lib/supabase/` with client, server, admin, middleware |
| 7 | Initial admin user seed | SQL insert for super_admin user with hashed password |
| 8 | Verification queries | Run `SELECT count(*)` against all seeded tables; validate FK integrity |

**Estimated effort for Phase 6.2**: 1–2 days (schema design already complete; execution is mechanical DDL + Supabase dashboard setup).

---

*End of Phase 6.1 — Database Architecture Audit & Proposal*
