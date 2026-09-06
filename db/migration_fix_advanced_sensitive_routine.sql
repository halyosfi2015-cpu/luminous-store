-- FIX: Advanced Sensitive Skin Routine (eada30ae) - Missing products & steps
-- This routine's routine_products and routine_steps were never applied to Supabase.
-- Product UUIDs come from seed.sql, products have legacy_ids in the catalog.

-- First ensure the products exist (they should, with these legacy_ids):
-- e51c01a2-0473-5bf5-8569-7d096d87f0ea -> yq-2680 (Numbuzin PDRN Toner)
-- f6910df7-7679-56a4-89bf-8083a2185ba9 -> yq-960  (Garnier Green Kale Serum)
-- aa026274-ffa1-5589-8c7c-08df95c3841d -> yq-2041 (Bioderma Atoderm Cream)
-- 7ea3e2fb-045d-5bff-8057-c92bf77974c3 -> yq-2764 (Garnier Cicaplast Gel)

-- Insert routine_products (skip duplicates with ON CONFLICT DO NOTHING)
INSERT INTO routine_products (id, routine_id, product_id) VALUES
  ('348e4dac-8eb0-5c6e-8dc9-89ca8dacb556', 'eada30ae-cde2-5900-8623-e447d4313ad7', 'e51c01a2-0473-5bf5-8569-7d096d87f0ea'),
  ('2f8a9062-a516-5c2a-81ae-0f2a59cda04d', 'eada30ae-cde2-5900-8623-e447d4313ad7', 'f6910df7-7679-56a4-89bf-8083a2185ba9'),
  ('436bd3fd-33d6-5b26-83d7-140ecbf13d60', 'eada30ae-cde2-5900-8623-e447d4313ad7', 'aa026274-ffa1-5589-8c7c-08df95c3841d'),
  ('0f7b1ea7-8825-57fc-834b-5d4068a3d052', 'eada30ae-cde2-5900-8623-e447d4313ad7', '7ea3e2fb-045d-5bff-8057-c92bf77974c3')
ON CONFLICT (routine_id, product_id) DO NOTHING;

-- Insert routine_steps (skip duplicates with ON CONFLICT DO NOTHING)
INSERT INTO routine_steps (id, routine_id, product_id, step_number, title_ar, title_en, description_ar, description_en, time_of_day) VALUES
  ('1783e7c2-11f1-5274-8fc6-39dd2e6b52e8', 'eada30ae-cde2-5900-8623-e447d4313ad7', 'e51c01a2-0473-5bf5-8569-7d096d87f0ea', 1, 'toner PDRN', 'Step 1 - PDRN Toner', 'Numbuzin PDRN toner to strengthen and repair damaged skin.', 'Apply Numbuzin PDRN toner to strengthen and repair damaged skin.', 'both'),
  ('6faf0498-964b-5135-8fd0-436057c1aeed', 'eada30ae-cde2-5900-8623-e447d4313ad7', 'f6910df7-7679-56a4-89bf-8083a2185ba9', 2, 'Green Kale Serum', 'Step 2 - Green Kale Serum', 'Holy Green Kale soothing serum for deep calm and repair.', 'Use the Holy Green Kale soothing serum for deep calm and repair.', 'both'),
  ('b83c0920-dc41-5686-8dba-831bc35da29e', 'eada30ae-cde2-5900-8623-e447d4313ad7', 'aa026274-ffa1-5589-8c7c-08df95c3841d', 3, 'Atoderm Cream', 'Step 3 - Atoderm Cream', 'Dermatological Atoderm cream to seal in repair.', 'Apply dermatological Atoderm cream to seal in repair.', 'both'),
  ('7e524a05-f373-5c21-8010-3b4813712e27', 'eada30ae-cde2-5900-8623-e447d4313ad7', '7ea3e2fb-045d-5bff-8057-c92bf77974c3', 4, 'Cicaplast Gel', 'Step 4 - Cicaplast Gel', 'Cicaplast soothing gel for damaged skin.', 'Finish with Cicaplast soothing gel for damaged skin.', 'both')
ON CONFLICT (routine_id, product_id) DO NOTHING;