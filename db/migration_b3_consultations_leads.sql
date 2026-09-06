-- ============================================================================
-- B3: CONSULTATION REQUESTS & EXPERT ENROLLMENTS — CANONICAL PERSISTENCE
-- Two distinct entities (never merged):
--   consultation_requests : customer → expert booking leads
--   expert_enrollments    : expert applications
--
-- RLS:
--   Anyone (anon/authed) may INSERT a request (public submission forms).
--   No client can SELECT or UPDATE — these are internal lead records.
--   Active admin_users have full access (same pattern as other tables).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consultation_requests (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  expert_id         TEXT NOT NULL,
  expert_name       TEXT NOT NULL,
  client_name       TEXT NOT NULL,
  client_phone      TEXT NOT NULL,
  client_email      TEXT,
  consultation_type TEXT NOT NULL CHECK (consultation_type IN ('online','in-person')),
  preferred_day     TEXT NOT NULL,
  preferred_time    TEXT NOT NULL,
  concern           TEXT NOT NULL,
  concern_details   TEXT,
  referral_source   TEXT,
  referral_expert_id TEXT,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultation_requests_status ON consultation_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultation_requests_expert ON consultation_requests (expert_id);

CREATE TABLE IF NOT EXISTS public.expert_enrollments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  name_ar           TEXT NOT NULL,
  email             TEXT NOT NULL,
  phone             TEXT NOT NULL,
  specialty         TEXT NOT NULL,
  specialty_ar      TEXT NOT NULL,
  bio               TEXT NOT NULL,
  bio_ar            TEXT NOT NULL,
  city              TEXT NOT NULL,
  city_ar           TEXT NOT NULL,
  consultation_types JSONB NOT NULL DEFAULT '[]'::JSONB,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  admin_notes       TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expert_enrollments_status ON expert_enrollments (status, created_at DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.consultation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expert_enrollments ENABLE ROW LEVEL SECURITY;

-- Public submission: insert-only, no reads, no updates.
CREATE POLICY "Public submit consultation" ON public.consultation_requests
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Public submit enrollment" ON public.expert_enrollments
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admin full access (active admins only).
CREATE POLICY "Admin full access" ON public.consultation_requests USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

CREATE POLICY "Admin full access" ON public.expert_enrollments USING (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM admin_users WHERE auth_id = auth.uid() AND is_active = true)
);

-- Keep updated_at fresh.
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_consultation_requests_updated_at ON public.consultation_requests;
CREATE TRIGGER trg_consultation_requests_updated_at
  BEFORE UPDATE ON public.consultation_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- PRIVILEGES (tables created via direct SQL need explicit grants)
-- ============================================================================

GRANT INSERT ON public.consultation_requests TO anon, authenticated;
GRANT SELECT, UPDATE ON public.consultation_requests TO authenticated;
GRANT ALL ON public.consultation_requests TO service_role;

GRANT INSERT ON public.expert_enrollments TO anon, authenticated;
GRANT SELECT, UPDATE ON public.expert_enrollments TO authenticated;
GRANT ALL ON public.expert_enrollments TO service_role;
