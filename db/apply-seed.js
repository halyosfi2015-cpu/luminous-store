const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');
const env = {};
fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [key, ...rest] = line.split('=');
  if (key && rest.length > 0) env[key.trim()] = rest.join('=').trim();
});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sqlPath = path.join(__dirname, 'seed.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

async function main() {
  console.log('Applying seed.sql (' + (sql.length / 1024).toFixed(0) + ' KB)...');
  
  const start = Date.now();
  const { error } = await supabase.rpc('exec_sql', { sql_text: sql }).maybeSingle();
  
  if (error) {
    // Try split by statement (semicolons on their own lines or at end)
    console.log('Bulk RPC failed, trying split by statement...');
    const statements = sql
      .split(';\n')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    let ok = 0, fail = 0;
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      if (stmt === 'BEGIN' || stmt === 'COMMIT') continue;
      try {
        const { error: e } = await supabase.rpc('exec_sql', { sql_text: stmt + ';' }).maybeSingle();
        if (e) { fail++; if (fail <= 5) console.log('  FAIL:', e.message.substring(0, 100)); }
        else ok++;
      } catch { fail++; }
    }
    console.log(`Statements: ${ok} ok, ${fail} failed`);
  } else {
    console.log('Seed applied successfully in ' + (Date.now() - start) + 'ms');
  }

  // Verify counts
  console.log('\nVerifying row counts...');
  const counts = {};
  const checks = [
    'categories', 'brands', 'products', 'reviews', 'routines', 'routine_steps',
    'experts', 'articles', 'bundles', 'faqs', 'testimonials', 'governorates',
    'gift_options', 'site_settings', 'bundle_products', 'routine_products',
    'expert_products', 'expert_articles', 'article_products',
  ];
  
  for (const t of checks) {
    const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
    counts[t] = error ? 'ERR' : count;
  }
  
  console.log('categories:', counts.categories);
  console.log('brands:', counts.brands);
  console.log('products:', counts.products);
  console.log('reviews:', counts.reviews);
  console.log('routines:', counts.routines);
  console.log('routine_steps:', counts.routine_steps);
  console.log('experts:', counts.experts);
  console.log('articles:', counts.articles);
  console.log('bundles:', counts.bundles);
  console.log('faqs:', counts.faqs);
  console.log('testimonials:', counts.testimonials);
  console.log('governorates:', counts.governorates);
  console.log('gift_options:', counts.gift_options);
  console.log('site_settings:', counts.site_settings);
  console.log('bundle_products:', counts.bundle_products);
  console.log('routine_products:', counts.routine_products);
  console.log('expert_products:', counts.expert_products);
  console.log('expert_articles:', counts.expert_articles);
  console.log('article_products:', counts.article_products);
}

main().catch(e => console.error('FATAL:', e.message));
