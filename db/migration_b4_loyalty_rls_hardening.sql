-- ============================================================================
-- B4: LOYALTY POINTS RLS HARDENING
--
-- Vulnerability: customer-owner policies allowed clients to modify their own
-- authoritative loyalty fields (points / lifetime_points / tier) and to forge
-- earn/redeem ledger entries. Also: anon/authenticated held stray privileges
-- (incl. TRUNCATE, which bypasses RLS entirely).
--
-- Security model after this migration:
--   Customer  → READ own loyalty account + transactions only.
--   Customer  → NO writes of any kind to loyalty data.
--   Admin     → full access via admin_users RLS (unchanged).
--   Service   → full access via service_role grants (server-side award path).
-- ============================================================================

-- 1. Remove the vulnerable customer UPDATE policy entirely.
DROP POLICY IF EXISTS "Customer update loyalty account" ON public.loyalty_accounts;

-- 2. Tighten INSERT: a customer may create their own account, but ONLY with
--    zeroed authoritative balances (registration bootstrap), never arbitrary points.
DROP POLICY IF EXISTS "Customer insert loyalty account" ON public.loyalty_accounts;
CREATE POLICY "Customer insert loyalty account" ON public.loyalty_accounts
  FOR INSERT TO authenticated WITH CHECK (
    auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
    AND points = 0
    AND lifetime_points = 0
  );

-- 3. Clients must NEVER write ledger entries (forge earn/redeem history).
DROP POLICY IF EXISTS "Customer insert loyalty transactions" ON public.loyalty_transactions;

-- 4. Strip stray client privileges. TRUNCATE bypasses row level security,
--    so anon/authenticated must hold no mutation grants at all.
REVOKE ALL ON public.loyalty_accounts     FROM anon;
REVOKE ALL ON public.loyalty_accounts     FROM authenticated;
GRANT  SELECT ON public.loyalty_accounts  TO authenticated;

REVOKE ALL ON public.loyalty_transactions FROM anon;
REVOKE ALL ON public.loyalty_transactions FROM authenticated;
GRANT  SELECT ON public.loyalty_transactions TO authenticated;

-- 5. Ensure the trusted server-side helper is not writable-by-abuse:
--    keep it SECURITY INVOKER (default) so callers still need table privileges.
ALTER FUNCTION public.ensure_loyalty_account(UUID) SECURITY INVOKER;

-- 6. Latent bug fix: the ownership policies subquery customers, but
--    authenticated never held SELECT on it (policy evaluation failed with 42501).
--    Customers-table RLS ("Customer owns data") still restricts rows to their own.
GRANT SELECT ON public.customers TO authenticated;

-- 6b. Hygiene: strip the dangerous stray TRUNCATE privilege on customers
--     (TRUNCATE bypasses RLS entirely).
REVOKE TRUNCATE ON public.customers FROM anon, authenticated;

-- 7. Admin-policy evaluation safety: policies OR-referencing admin_users fail
--    with 42501 when a non-admin role evaluates them (no SELECT on admin_users).
--    Use a SECURITY DEFINER helper so policy evaluation never leaks nor fails.
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true
  );
$$;

DROP POLICY IF EXISTS "Admin full access" ON public.loyalty_accounts;
CREATE POLICY "Admin full access" ON public.loyalty_accounts
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admin full access" ON public.loyalty_transactions;
CREATE POLICY "Admin full access" ON public.loyalty_transactions
  USING (public.is_admin()) WITH CHECK (public.is_admin());
