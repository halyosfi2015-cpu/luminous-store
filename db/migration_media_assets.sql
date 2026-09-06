-- Media Assets table for admin media library
-- Stores image/video references managed via the admin panel

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image' CHECK (type IN ('image', 'video')),
  label TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: allow admin read/write, public read
ALTER TABLE media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage media assets" ON media_assets
  FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Public can read media assets" ON media_assets
  FOR SELECT
  USING (true);

-- Index for ordering
CREATE INDEX IF NOT EXISTS idx_media_assets_created_at ON media_assets (created_at DESC);
