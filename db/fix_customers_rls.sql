-- Fix RLS for customers table — allow authenticated users to insert their own customer record
-- This fixes the 403 Forbidden on POST /rest/v1/customers and 406 on GET

-- Allow authenticated users to insert their own customer row
DROP POLICY IF EXISTS "Customer can insert own data" ON customers;
CREATE POLICY "Customer can insert own data" ON customers FOR INSERT WITH CHECK (
  auth.uid() = auth_id
);

-- Allow authenticated users to delete their own customer row (for cleanup, though not strictly needed)
DROP POLICY IF EXISTS "Customer can delete own data" ON customers;
CREATE POLICY "Customer can delete own data" ON customers FOR DELETE USING (
  auth.uid() = auth_id
);

-- Ensure the authenticated role has proper grants (if missing)
GRANT SELECT, INSERT, UPDATE, DELETE ON customers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON orders TO authenticated;
GRANT SELECT, INSERT ON order_items TO authenticated;
