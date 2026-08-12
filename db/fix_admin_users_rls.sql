-- =============================================================================
-- FIX: Recursive RLS policy on `admin_users` (live-DB drift from db/schema.sql)
--
-- Symptom: EVERY anon/session query that touches a table with an
--   "Admin full access" policy (products, categories, offers, banners, ...)
--   fails with:
--     infinite recursion detected in policy for relation "admin_users"
--
-- Root cause: the live `admin_users` table has an RLS policy whose USING
--   expression queries `admin_users` itself. The correct policy (from
--   db/schema.sql, section 8.3) is NON-recursive and only grants access to
--   the service_role JWT (which bypasses RLS anyway).
--
-- HOW TO APPLY:
--   Supabase Dashboard -> SQL Editor -> paste this whole file -> Run.
--   It is idempotent: safe to run twice.
-- =============================================================================

-- 1) Drop EVERY existing policy on admin_users (removes the recursive one,
--    whatever its name happens to be in the live DB).
DO $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'admin_users'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.admin_users', p.policyname);
  END LOOP;
END $$;

-- 2) Recreate the correct, NON-recursive policy (matches db/schema.sql:875).
--    Only the service_role JWT can touch admin_users; PostgREST with the
--    anon/user JWT gets zero rows (no recursion, no data leak).
CREATE POLICY "Admin full access" ON public.admin_users
USING (
  coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'service_role'
)
WITH CHECK (
  coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', 'anon') = 'service_role'
);

-- 3) Optional sanity check: should print ZERO rows and NO error.
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'admin_users';
