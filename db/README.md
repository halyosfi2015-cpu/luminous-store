# Luminous Derma — Database Setup Guide

## 1. Overview

Luminous Derma runs on **Supabase PostgreSQL** with **30 tables** and **Row-Level Security (RLS)** enabled. This guide covers schema creation, seeding, and verification.

---

## 2. Prerequisites

- A [Supabase](https://supabase.com) account
- Node.js 18+
- psql or the Supabase CLI (optional, the SQL Editor is sufficient)

---

## 3. Quick Start

1. **Create a Supabase project** at [supabase.com](https://supabase.com) — choose the region closest to your users.
2. **Copy your API keys:** In the Supabase dashboard, go to *Project Settings → API*, then copy:
   - Project URL
   - `anon` / `public` key
   - `service_role` key
3. **Set environment variables:** Copy `.env.example` to `.env.local` and paste the keys into their respective fields.
4. **Open the SQL Editor** in the Supabase dashboard.
5. **Run the schema:** Copy-paste the contents of `db/schema.sql` into the SQL Editor and execute it.
6. **Seed the data:** Copy-paste the contents of `db/seed.sql` into the SQL Editor and execute it. This inserts all 354 products, 50 categories, 108 brands, 8 experts, 8 articles, 4 bundles, 21 governorates, 5 FAQs, and 5 testimonials.
7. **Verify:** Confirm all tables and rows exist (see [Verification Queries](#7-verification-queries)).

---

## 4. Environment Variables

| Variable                        | Source                                     | Usage                       |
| ------------------------------- | ------------------------------------------ | --------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Project Settings → API → Project URL       | Client + Server             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API → `anon`/`public`   | Client reads                |
| `SUPABASE_SERVICE_ROLE_KEY`     | Project Settings → API → `service_role`    | Server-only (API routes)    |

> **Warning:** Never commit `.env.local` or expose the `service_role` key to client-side code. The service_role key bypasses RLS entirely.

---

## 5. Schema Overview

### Core Catalog (12)
`categories`, `brands`, `products`, `experts`, `articles`, `bundles`, `routines`, `routine_steps`, `reviews`, `faqs`, `testimonials`, `governorates`

### Junction / Relational (5)
`bundle_products`, `routine_products`, `expert_products`, `expert_articles`, `article_products`

### Transactional (5)
`customers`, `addresses`, `orders`, `order_items`, `coupons`

### Marketing & Configuration (5)
`banners`, `homepage_sections`, `offers`, `hero_campaigns`, `gift_options`

### Admin & Authentication (3)
`admin_users`, `admin_sessions`, `site_settings`

---

## 6. RLS Policies — Summary

| Category              | Read               | Write              |
| --------------------- | ------------------ | ------------------ |
| Core Catalog          | Public             | Admin only         |
| Customer data         | Own user + Admin   | Own user + Admin   |
| Admin tables          | Admin only         | Admin only         |
| Transactional         | Own user + Admin   | Own user + Admin   |

---

## 7. Verification Queries

Run the following in the Supabase SQL Editor after executing the schema:

```sql
-- Total table count (should return 30)
SELECT count(*) AS table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- Installed extensions
SELECT * FROM pg_extension;

-- Row counts (all should be 0 before seeding)
SELECT 'categories'    AS tbl, count(*) FROM categories    UNION ALL
SELECT 'brands'        AS tbl, count(*) FROM brands        UNION ALL
SELECT 'products'      AS tbl, count(*) FROM products      UNION ALL
SELECT 'experts'       AS tbl, count(*) FROM experts       UNION ALL
SELECT 'articles'      AS tbl, count(*) FROM articles      UNION ALL
SELECT 'bundles'       AS tbl, count(*) FROM bundles       UNION ALL
SELECT 'routines'      AS tbl, count(*) FROM routines      UNION ALL
SELECT 'routine_steps' AS tbl, count(*) FROM routine_steps UNION ALL
SELECT 'reviews'       AS tbl, count(*) FROM reviews       UNION ALL
SELECT 'faqs'          AS tbl, count(*) FROM faqs          UNION ALL
SELECT 'testimonials'  AS tbl, count(*) FROM testimonials  UNION ALL
SELECT 'governorates'  AS tbl, count(*) FROM governorates  UNION ALL
SELECT 'bundle_products'   AS tbl, count(*) FROM bundle_products   UNION ALL
SELECT 'routine_products'  AS tbl, count(*) FROM routine_products  UNION ALL
SELECT 'expert_products'   AS tbl, count(*) FROM expert_products   UNION ALL
SELECT 'expert_articles'   AS tbl, count(*) FROM expert_articles   UNION ALL
SELECT 'article_products'  AS tbl, count(*) FROM article_products  UNION ALL
SELECT 'customers'         AS tbl, count(*) FROM customers         UNION ALL
SELECT 'addresses'         AS tbl, count(*) FROM addresses         UNION ALL
SELECT 'orders'            AS tbl, count(*) FROM orders            UNION ALL
SELECT 'order_items'       AS tbl, count(*) FROM order_items       UNION ALL
SELECT 'coupons'           AS tbl, count(*) FROM coupons           UNION ALL
SELECT 'banners'           AS tbl, count(*) FROM banners           UNION ALL
SELECT 'homepage_sections' AS tbl, count(*) FROM homepage_sections UNION ALL
SELECT 'offers'            AS tbl, count(*) FROM offers            UNION ALL
SELECT 'hero_campaigns'    AS tbl, count(*) FROM hero_campaigns    UNION ALL
SELECT 'gift_options'      AS tbl, count(*) FROM gift_options      UNION ALL
SELECT 'admin_users'       AS tbl, count(*) FROM admin_users       UNION ALL
SELECT 'admin_sessions'    AS tbl, count(*) FROM admin_sessions    UNION ALL
SELECT 'site_settings'     AS tbl, count(*) FROM site_settings;
```

---

## 8. Troubleshooting

| Issue                                    | Likely Cause                                     | Fix                                                    |
| ---------------------------------------- | ------------------------------------------------ | ------------------------------------------------------ |
| `relation "..." does not exist`          | Schema has not been run yet                      | Execute `db/schema.sql` in the SQL Editor              |
| `permission denied for table ...`        | RLS policy blocks the current role               | Verify `auth.uid()` matches or use the service_role key |
| `Could not find the 'uuid-ossp'` extension | Extension not enabled                         | Run `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`       |
| Foreign key violation during seed    | Data inserted in wrong order                     | Seed `products` before `bundles` / `routines`           |

---

## 9. Migration — Gift Options `description` + `code`

The `gift_options` table in `db/schema.sql` includes `description` (JSONB `{ar, en}`)
and `code` (TEXT canonical option id) columns for deterministic, symmetric
Supabase field mapping. Existing databases that were created before these columns
existed must run this one-time statement in the SQL Editor:

```sql
ALTER TABLE gift_options
  ADD COLUMN IF NOT EXISTS description JSONB,
  ADD COLUMN IF NOT EXISTS code TEXT;
```

---

## 10. Phase 6.1 — Future Foundation Migration

Adds **9 foundation tables** for future phases (Analytics, Personalization,
Campaigns, AI-driven systems). **Additive, idempotent, and safe to re-run**.
Does not modify any existing table, column, policy, or data.

### 10.1 New Tables

| Section | Table | Purpose |
|---|---|---|
| Customer | `customer_profiles` | 1:1 extension of `customers` (preferences, aggregates, opt-ins) |
| Analytics | `customer_events` | Append-only event log (anonymous + identified) |
| Campaigns | `campaigns` | Marketing campaign definitions |
| Campaigns | `campaign_messages` | Per-recipient dispatch + delivery status |
| AI Readiness | `customer_segments` | Logical customer groupings (rules JSONB) |
| AI Readiness | `customer_segment_members` | M:N bridge (cached/manual memberships) |
| AI Readiness | `personalization_rules` | Declarative rules with conditions/actions JSONB |
| AI Readiness | `recommendations` | Per-customer product recommendations lifecycle |
| AI Readiness | `purchase_intent_signals` | Behavioral signals feeding recommendations |

> **Commerce** is fully covered by the existing 30 tables — no new tables added.

### 10.2 How to Apply

1. Open the Supabase SQL Editor.
2. Copy-paste the contents of `db/migration_phase_6_1_future_foundation.sql`.
3. Execute.

The migration is **idempotent**: every `CREATE` uses `IF NOT EXISTS`, every
policy is wrapped in `DROP POLICY IF EXISTS + CREATE POLICY`, and every
trigger uses `DROP TRIGGER IF EXISTS + CREATE TRIGGER`. Re-running the file
is safe.

### 10.3 Verification Queries

After running the migration, confirm the 9 tables exist with RLS enabled:

```sql
-- Should return 9 rows
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'customer_profiles','customer_events','campaigns','campaign_messages',
    'customer_segments','customer_segment_members','personalization_rules',
    'recommendations','purchase_intent_signals'
  )
ORDER BY tablename;

-- RLS must be enabled on all 9 (rowsecurity = true)
-- All tables should be empty (0 rows) — no data is seeded by this migration.
SELECT 'customer_profiles'        AS tbl, count(*) FROM customer_profiles        UNION ALL
SELECT 'customer_events'          AS tbl, count(*) FROM customer_events          UNION ALL
SELECT 'campaigns'                AS tbl, count(*) FROM campaigns                UNION ALL
SELECT 'campaign_messages'        AS tbl, count(*) FROM campaign_messages        UNION ALL
SELECT 'customer_segments'        AS tbl, count(*) FROM customer_segments        UNION ALL
SELECT 'customer_segment_members' AS tbl, count(*) FROM customer_segment_members UNION ALL
SELECT 'personalization_rules'    AS tbl, count(*) FROM personalization_rules    UNION ALL
SELECT 'recommendations'          AS tbl, count(*) FROM recommendations          UNION ALL
SELECT 'purchase_intent_signals'  AS tbl, count(*) FROM purchase_intent_signals;

-- updated_at triggers must exist on the 5 tables that have updated_at columns
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table IN (
    'customer_profiles','campaigns','campaign_messages',
    'customer_segments','personalization_rules'
  )
ORDER BY event_object_table;
```

### 10.4 Programmatic Verification

Run `db/verify_phase_6_1.js` to validate the migration without manual SQL:

```bash
node db/verify_phase_6_1.js
```

Checks performed: table existence, RLS enabled, indexes present, policies
present, FK relationships, total table count unchanged (30 + 9 = 39),
and no destructive operations performed.

