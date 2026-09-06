-- Add display_order column to bundles table for reordering
ALTER TABLE bundles ADD COLUMN IF NOT EXISTS display_order INT DEFAULT 0;

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_bundles_display_order ON bundles (display_order);

-- Update existing bundles with default display_order based on slug
UPDATE bundles SET display_order = 0 WHERE display_order IS NULL;