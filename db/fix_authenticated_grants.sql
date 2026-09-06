-- ============================================================================
-- FIX: missing SELECT grants for the `authenticated` role
--
-- Symptom: any query made with a logged-in user's JWT fails with:
--     permission denied for table products / brands / categories
--
-- Impact (before the server-side workaround):
--   - Checkout API  → 500 catalog_unavailable (products/bundles/routines reads)
--   - Admin product save → "Brand not found" (brand/category lookup)
--
-- Root cause: db/schema.sql enables RLS and creates permissive SELECT
--   policies ("Public read access") on these tables, but the live database is
--   missing the underlying table-level GRANTs for the `authenticated` role
--   (`anon` works because it has its own grant). RLS policies can only ever
--   restrict rows; they cannot grant table privileges that were revoked.
--
-- Fix: grant READ-ONLY access to `authenticated` — identical to what `anon`
--   already effectively has via its policies. NO write privileges are granted:
--   all admin writes keep flowing through requireAdmin + RBAC + service-role.
--
-- HOW TO APPLY:
--   Supabase Dashboard → SQL Editor → paste this whole file → Run.
--   Idempotent: safe to run twice.
-- ============================================================================

GRANT SELECT ON public.products        TO authenticated;
GRANT SELECT ON public.brands          TO authenticated;
GRANT SELECT ON public.categories      TO authenticated;
GRANT SELECT ON public.reviews         TO authenticated;
GRANT SELECT ON public.routines        TO authenticated;
GRANT SELECT ON public.bundles         TO authenticated;
