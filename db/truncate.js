const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
const env = {};
raw.split('\n').forEach(l => { const m = l.trim().match(/^(\w+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; });

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Delete all seeded data in reverse dependency order
  const tables = [
    'routine_steps', 'routine_products', 'bundle_products', 'article_products',
    'expert_articles', 'expert_products', 'reviews', 'order_items', 'orders',
    'products', 'routines', 'bundles', 'articles', 'experts',
    'categories', 'brands', 'governorates', 'faqs', 'testimonials',
    'gift_options', 'site_settings', 'banners', 'coupons',
    'homepage_sections', 'offers', 'hero_campaigns'
  ];

  console.log('Truncating all tables...');
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const msg = error ? error.message : 'OK';
    if (!error) console.log('  ' + t + ': cleared');
  }
  console.log('Done. Re-running seed...');
}

main().catch(e => console.error(e.message));
