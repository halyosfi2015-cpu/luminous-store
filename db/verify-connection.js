const fs = require('fs');
const path = require('path');

// Parse .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const tables = [
  'products', 'categories', 'brands', 'routines', 'experts',
  'articles', 'bundles', 'reviews', 'gift_options', 'site_settings',
  'faqs', 'testimonials', 'governorates', 'banners', 'coupons',
  'homepage_sections', 'offers', 'hero_campaigns',
  'customers', 'addresses', 'orders', 'order_items',
  'admin_users', 'admin_sessions',
  'bundle_products', 'routine_products', 'expert_products',
  'expert_articles', 'article_products', 'routine_steps',
];

async function main() {
  console.log('Checking Supabase connection...\n');
  let ok = 0, empty = 0, fail = 0;

  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
        console.log(`  ${t}: SCHEMA NOT APPLIED`);
        fail++;
      } else if (error) {
        console.log(`  ${t}: ERROR - ${error.message}`);
        fail++;
      } else if (count === 0) {
        console.log(`  ${t}: OK (0 rows)`);
        empty++;
      } else {
        console.log(`  ${t}: OK (${count} rows)`);
        ok++;
      }
    } catch (e) {
      console.log(`  ${t}: FAIL - ${e.message}`);
      fail++;
    }
  }

  console.log(`\n---`);
  console.log(`Populated: ${ok} | Empty: ${empty} | Missing: ${fail}`);
  if (fail === 30) console.log('\nAll tables missing — schema.sql has NOT been applied to this Supabase project.');
}

main().catch(e => console.error('FATAL:', e.message));
