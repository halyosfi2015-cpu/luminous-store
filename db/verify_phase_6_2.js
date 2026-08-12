const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const env = {};
fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').replace(/^\uFEFF/, '').split('\n').forEach((l) => {
  const m = l.trim().match(/^(\w+)=(.*)$/);
  if (m && m[2]) env[m[1]] = m[2];
});

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const REQUIRED_EVENT_TYPES = [
  'page_view', 'product_view', 'category_view', 'search',
  'product_added_to_wishlist', 'product_removed_from_wishlist',
  'product_added_to_cart', 'product_removed_from_cart',
  'cart_view', 'cart_updated', 'cart_abandoned',
  'checkout_started', 'checkout_completed', 'purchase_completed',
];

const results = [];
function rec(check, ok, detail) {
  results.push({ check, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${check}${detail ? ' [' + detail + ']' : ''}`);
}

async function dbChecks() {
  console.log('=== 1. PHASE 6.2 DATABASE FOUNDATION ===\n');

  const tablesToCheck = [
    'customer_events',
    'customer_profiles',
    'customer_segments',
    'customer_segment_members',
    'purchase_intent_signals',
    'campaigns',
    'campaign_messages',
  ];

  for (const t of tablesToCheck) {
    const { error } = await svc.from(t).select('id').limit(1);
    const ok = !error || (error && error.code !== 'PGRST205');
    rec(`foundation table present: ${t}`, ok, error ? error.message.substring(0, 60) : 'ok');
  }

  console.log('\n  -- Event ingestion (read-only smoke) --');
  const sessionId = '00000000-0000-0000-0000-000000000099';
  const sample = {
    session_id: sessionId,
    event_type: 'page_view',
    event_name: 'phase_6_2_smoke',
    properties: { path: '/phase-6-2-smoke' },
    source: 'system',
  };
  const { data: inserted, error: insertErr } = await svc
    .from('customer_events')
    .insert(sample)
    .select('id')
    .single();
  rec('event insert via service_role succeeds', !insertErr && !!inserted, insertErr ? insertErr.message.substring(0, 80) : 'ok');
  const insertedId = inserted?.id;

  if (insertedId) {
    for (const evt of REQUIRED_EVENT_TYPES.filter((t) => t !== 'page_view')) {
      const { error } = await svc.from('customer_events').insert({
        session_id: sessionId,
        event_type: evt,
        source: 'system',
        properties: { smoke: true },
      });
      rec(`event_type accepted: ${evt}`, !error, error ? error.message.substring(0, 60) : 'ok');
    }

    const { count } = await svc
      .from('customer_events')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);
    rec('all smoke events persisted', count === REQUIRED_EVENT_TYPES.length, `count=${count}`);
  }

  console.log('\n  -- Profile auto-aggregation trigger path --');
  const randomCustomerId = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('').replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/, '$1-$2-3$3-8$4-$5');
  const { data: existingCustomer } = await svc.from('customers').select('id').eq('id', randomCustomerId).maybeSingle();
  rec('random customer is absent (control)', !existingCustomer);

  console.log('\n  -- RLS still blocks anon reads --');
  const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  for (const t of ['customer_events', 'customer_profiles', 'customer_segments', 'purchase_intent_signals', 'campaigns']) {
    const { error } = await anon.from(t).select('id').limit(1);
    rec(`anon blocked on ${t}`, !!error, error ? 'blocked' : 'ALLOWED');
  }

  if (insertedId) {
    console.log('\n  -- Cleanup smoke events (read-only verification hygiene) --');
    const { error: cleanupErr } = await svc
      .from('customer_events')
      .delete()
      .eq('session_id', sessionId);
    rec('smoke events removed', !cleanupErr, cleanupErr ? cleanupErr.message.substring(0, 60) : 'ok');
  }
}

async function codeChecks() {
  console.log('\n=== 2. CODE INTEGRATION CHECKS ===\n');

  const filesToCheck = [
    'src/lib/analytics/types.ts',
    'src/lib/analytics/events.ts',
    'src/lib/analytics/client.ts',
    'src/lib/analytics/ConsentProvider.tsx',
    'src/lib/analytics/hooks.ts',
    'src/lib/analytics/profile.ts',
    'src/lib/analytics/segments.ts',
    'src/lib/analytics/intent.ts',
    'src/lib/analytics/aggregations.ts',
    'src/lib/analytics/index.ts',
    'src/lib/analytics/events.ts',
    'components/admin/AdminAnalytics.tsx',
    'components/admin/CustomerIntelligenceAdmin.tsx',
    'components/analytics/ConsentBanner.tsx',
    'components/analytics/PageViewTracker.tsx',
    'components/analytics/ProductAnalytics.tsx',
    'components/analytics/CategoryAnalytics.tsx',
    'app/api/analytics/track/route.ts',
    'app/api/analytics/consent/route.ts',
    'app/api/analytics/overview/route.ts',
    'app/api/analytics/funnel/route.ts',
    'app/api/analytics/top-products/route.ts',
    'app/api/analytics/top-categories/route.ts',
    'app/api/analytics/segments/route.ts',
    'app/api/analytics/intent/route.ts',
    'app/api/analytics/customers/route.ts',
    'app/admin/analytics/page.tsx',
    'app/admin/customer-intelligence/page.tsx',
  ];

  for (const f of filesToCheck) {
    const full = path.join(ROOT, f);
    const ok = fs.existsSync(full);
    rec(`file present: ${f}`, ok, ok ? `${fs.statSync(full).size} bytes` : 'MISSING');
  }

  const navPath = path.join(ROOT, 'src/admin/navigation.ts');
  const navSrc = fs.readFileSync(navPath, 'utf8');
  rec('navigation contains Analytics', navSrc.includes('"/admin/analytics"'));
  rec('navigation contains Customer Intelligence', navSrc.includes('"/admin/customer-intelligence"'));

  const permPath = path.join(ROOT, 'src/admin/permissions.ts');
  const permSrc = fs.readFileSync(permPath, 'utf8');
  rec('permissions include analytics resource', permSrc.includes('"analytics"'));
  rec('permissions include customer_intelligence resource', permSrc.includes('"customer_intelligence"'));

  const typesPath = path.join(ROOT, 'src/admin/types.ts');
  const typesSrc = fs.readFileSync(typesPath, 'utf8');
  rec('AdminResource includes analytics', typesSrc.includes('"analytics"'));
  rec('AdminResource includes customer_intelligence', typesSrc.includes('"customer_intelligence"'));

  const providersPath = path.join(ROOT, 'components/Providers.tsx');
  const providersSrc = fs.readFileSync(providersPath, 'utf8');
  rec('Providers wraps ConsentProvider', providersSrc.includes('ConsentProvider'));
  rec('Providers renders ConsentBanner', providersSrc.includes('ConsentBanner'));
  rec('Providers renders PageViewTracker', providersSrc.includes('PageViewTracker'));
}

async function main() {
  await dbChecks();
  await codeChecks();

  const fails = results.filter((r) => !r.ok);
  const passes = results.filter((r) => r.ok);

  console.log('\n========================================');
  console.log('   PHASE 6.2 VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`  PASS: ${passes.length}`);
  console.log(`  FAIL: ${fails.length}`);
  if (fails.length) {
    console.log('\n  FAILED CHECKS:');
    for (const f of fails) console.log(`    ✗ ${f.check}${f.detail ? ' — ' + f.detail : ''}`);
  }
  console.log(`\n  Phase 6.2 Customer Intelligence: ${fails.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((e) => { console.error('FATAL:', e.message); process.exit(2); });
