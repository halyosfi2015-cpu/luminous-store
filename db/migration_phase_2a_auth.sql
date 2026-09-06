-- ============================================================================
-- PHASE 2A — CUSTOMER AUTH & LOYALTY MIGRATION
-- ============================================================================
-- This migration:
-- 1. Creates loyalty_accounts table (per-customer loyalty balance)
-- 2. Creates loyalty_transactions table (earn/redeem history)
-- 3. Adds RLS policies for customer-owned loyalty data
-- 4. Adds missing INSERT policies on customers and loyalty_accounts
-- 5. Ensures customers table has proper auth integration
-- ============================================================================
-- PREREQUISITES:
-- - schema.sql already defines: customers (with auth_id), addresses (with customer_id),
--   orders (with customer_id), order_items, reviews, coupons
-- - Phase 1 migration already applied (audit_log, product columns, review status)
-- ============================================================================

-- ============================================================================
-- 1. LOYALTY ACCOUNTS TABLE
-- ============================================================================
-- One row per customer. Tracks current points, lifetime points, and tier.

CREATE TABLE IF NOT EXISTS loyalty_accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id     UUID UNIQUE NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  points          INT DEFAULT 0 NOT NULL,
  lifetime_points INT DEFAULT 0 NOT NULL,
  tier            TEXT DEFAULT 'bronze'
                  CHECK (tier IN ('bronze','silver','gold','platinum')),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_customer ON loyalty_accounts (customer_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_accounts_tier     ON loyalty_accounts (tier);

-- ============================================================================
-- 2. LOYALTY TRANSACTIONS TABLE
-- ============================================================================
-- Immutable log of every points earn/redeem event.

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES loyalty_accounts(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('earn','redeem')),
  amount          INT NOT NULL,
  label           TEXT NOT NULL,
  label_ar        TEXT,
  order_id        UUID REFERENCES orders(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_loyalty_txn_account ON loyalty_transactions (account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_txn_type    ON loyalty_transactions (type);
CREATE INDEX IF NOT EXISTS idx_loyalty_txn_created ON loyalty_transactions (created_at);

-- ============================================================================
-- 3. ENABLE RLS
-- ============================================================================

ALTER TABLE loyalty_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions  ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. ADMIN FULL ACCESS
-- ============================================================================

CREATE POLICY "Admin full access" ON loyalty_accounts USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON loyalty_transactions USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

-- ============================================================================
-- 5. CUSTOMER OWNERSHIP POLICIES
-- ============================================================================

-- Customers can read their own loyalty account
CREATE POLICY "Customer owns loyalty account" ON loyalty_accounts FOR SELECT USING (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);

-- Customers can update their own loyalty account (for points redemption)
CREATE POLICY "Customer update loyalty account" ON loyalty_accounts FOR UPDATE USING (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
) WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);

-- Customers can read their own loyalty transactions
CREATE POLICY "Customer owns loyalty transactions" ON loyalty_transactions FOR SELECT USING (
  auth.uid() IN (
    SELECT c.auth_id FROM customers c
    JOIN loyalty_accounts la ON la.customer_id = c.id
    WHERE la.id = account_id
  )
);

-- Customers can insert their own loyalty transactions (via edge function)
CREATE POLICY "Customer insert loyalty transactions" ON loyalty_transactions FOR INSERT WITH CHECK (
  auth.uid() IN (
    SELECT c.auth_id FROM customers c
    JOIN loyalty_accounts la ON la.customer_id = c.id
    WHERE la.id = account_id
  )
);

-- ============================================================================
-- 6. CUSTOMER INSERT POLICIES (missing from schema.sql)
-- ============================================================================

-- Customers can insert their own customer row (registration)
CREATE POLICY "Customer insert own" ON customers FOR INSERT WITH CHECK (
  auth.uid() = auth_id
);

-- Customers can insert their own loyalty account
CREATE POLICY "Customer insert loyalty account" ON loyalty_accounts FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT auth_id FROM customers WHERE id = customer_id)
);

-- ============================================================================
-- 7. TRIGGER: auto-update updated_at on loyalty_accounts
-- ============================================================================

CREATE TRIGGER trg_loyalty_accounts_updated_at
  BEFORE UPDATE ON loyalty_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================================
-- 8. HELPER FUNCTION: upsert loyalty account on first order
-- ============================================================================

CREATE OR REPLACE FUNCTION ensure_loyalty_account(p_customer_id UUID)
RETURNS UUID AS $$
DECLARE
  v_account_id UUID;
BEGIN
  INSERT INTO loyalty_accounts (customer_id, points, lifetime_points, tier)
  VALUES (p_customer_id, 0, 0, 'bronze')
  ON CONFLICT (customer_id) DO NOTHING
  RETURNING id INTO v_account_id;

  IF v_account_id IS NULL THEN
    SELECT id INTO v_account_id FROM loyalty_accounts WHERE customer_id = p_customer_id;
  END IF;

  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DONE
-- ============================================================================
