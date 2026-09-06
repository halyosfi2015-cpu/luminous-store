-- =============================================================================
-- Migration: Fix RLS 42501 on catalog tables
-- Root cause: "Admin full access" policies subquery admin_users directly;
--             admin_users denies SELECT to non-service_role → 42501 aborts
--             the entire query even though "Public read access" matches.
-- Fix: Use the existing SECURITY DEFINER is_admin() function which bypasses
--       admin_users RLS safely.
-- =============================================================================

-- Ensure is_admin() exists (created in migration_b4, idempotent)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true
  );
$$;

-- ── Helper: drop + recreate policy for a table ──────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'categories', 'brands', 'products', 'reviews', 'routines', 'routine_steps',
    'experts', 'articles', 'bundles', 'faqs', 'testimonials', 'governorates',
    'bundle_products', 'routine_products', 'expert_products', 'expert_articles',
    'article_products', 'banners', 'homepage_sections', 'offers', 'hero_campaigns',
    'gift_options', 'admin_sessions', 'site_settings'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "Admin full access" ON public.%I',
      tbl
    );
    EXECUTE format(
      'CREATE POLICY "Admin full access" ON public.%I
         USING (public.is_admin())
         WITH CHECK (public.is_admin())',
      tbl
    );
  END LOOP;
END $$;

-- ── admin_users: keep service_role-only (no change needed) ─────────────────
-- The admin_users table must remain service_role-only to protect admin credentials.
-- is_admin() is SECURITY DEFINER so it can read admin_users without the policy
-- granting access to authenticated/anon.

-- ── Explicit GRANTs for clarity ─────────────────────────────────────────────
-- Supabase default: anon + authenticated get SELECT on public tables.
-- These GRANTs make it explicit and ensure checkout (anon key + cookies) works.

GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.brands TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.routines TO anon, authenticated;
GRANT SELECT ON public.bundles TO anon, authenticated;
GRANT SELECT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.experts TO anon, authenticated;
GRANT SELECT ON public.articles TO anon, authenticated;
GRANT SELECT ON public.governorates TO anon, authenticated;
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT SELECT ON public.testimonials TO anon, authenticated;
GRANT SELECT ON public.gift_options TO anon, authenticated;
GRANT SELECT ON public.banners TO anon, authenticated;
GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT SELECT ON public.offers TO anon, authenticated;
GRANT SELECT ON public.hero_campaigns TO anon, authenticated;
GRANT SELECT ON public.site_settings TO anon, authenticated;

-- Admin write access: only through service_role (admin API uses service-role client)
-- No GRANT INSERT/UPDATE/DELETE to authenticated on catalog tables.
