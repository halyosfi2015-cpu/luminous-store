-- PART 3 — Social channel tokens (Meta/Facebook/Instagram).
-- Stores ENCRYPTED Page/User access tokens server-side. NEVER expose via API.
-- RLS: no policies at all → only service_role can read/write (it bypasses RLS).
-- Admin access goes exclusively through server routes guarded by requireAdmin.

CREATE TABLE IF NOT EXISTS social_channel_tokens (
  channel TEXT PRIMARY KEY CHECK (channel IN ('facebook', 'instagram', 'tiktok', 'whatsapp')),
  provider TEXT NOT NULL DEFAULT 'meta',
  page_id TEXT,
  page_name TEXT,
  ig_user_id TEXT,
  ig_username TEXT,
  access_token_enc TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_error TEXT,
  connected_by TEXT,
  connected_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE social_channel_tokens ENABLE ROW LEVEL SECURITY;
-- Intentionally NO policies: service_role bypasses RLS; anon/authenticated get nothing.

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_social_channel_tokens_updated ON social_channel_tokens;
CREATE TRIGGER trg_social_channel_tokens_updated
  BEFORE UPDATE ON social_channel_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
