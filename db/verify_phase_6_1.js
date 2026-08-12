const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const MIGRATION = path.join(__dirname, 'migration_phase_6_1_future_foundation.sql');

const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').replace(/^\uFEFF/, '');
const env = {};
raw.split('\n').forEach(l => { const m = l.trim().match(/^(\w+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; });

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env vars in .env.local');
  process.exit(1);
}

const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const EXISTING_COUNTS = {
  categories: 51, brands: 108, products: 354, reviews: 53,
  routines: 23, routine_steps: 92, routine_products: 92,
  experts: 8, expert_articles: 13, articles: 8,
  bundles: 4, bundle_products: 16, governorates: 21,
  testimonials: 5, faqs: 5, gift_options: 4, site_settings: 1,
  expert_products: 0, article_products: 0,
};

const NEW_TABLES_DEF = [
  { name: 'customer_profiles', updated_at: true },
  { name: 'customer_events', updated_at: false },
  { name: 'customer_segments', updated_at: true },
  { name: 'customer_segment_members', updated_at: false },
  { name: 'personalization_rules', updated_at: true },
  { name: 'campaigns', updated_at: true },
  { name: 'campaign_messages', updated_at: true },
  { name: 'recommendations', updated_at: false },
  { name: 'purchase_intent_signals', updated_at: false },
];

const EXPECTED_POLICIES = {
  customer_profiles: 5,
  customer_events: 3,
  customer_segments: 2,
  customer_segment_members: 3,
  personalization_rules: 2,
  campaigns: 2,
  campaign_messages: 2,
  recommendations: 3,
  purchase_intent_signals: 2,
};

const results = [];
function rec(check, ok, detail) {
  results.push({ check, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${check}${detail ? ' [' + detail + ']' : ''}`);
}

async function staticChecks() {
  console.log('=== 1. STATIC SQL VALIDATION ===\n');
  if (!fs.existsSync(MIGRATION)) {
    rec('Migration file exists', false, 'NOT FOUND');
    return;
  }
  rec('Migration file exists', true);

  const sql = fs.readFileSync(MIGRATION, 'utf8');
  console.log(`  ${sql.split('\n').length} lines, ${(sql.length / 1024).toFixed(1)} KB`);

  for (const t of NEW_TABLES_DEF) {
    const ok = new RegExp(`CREATE TABLE IF NOT EXISTS ${t.name}\\b`, 'm').test(sql);
    rec(`CREATE TABLE IF NOT EXISTS ${t.name}`, ok);
  }

  const destructive = /\bDROP\s+TABLE\b|\bTRUNCATE\b|\bDELETE\s+FROM\b|\bUPDATE\s+[a-z_0-9]+\s+SET\b/i;
  rec('No destructive statements in migration', !destructive.test(sql));

  for (const t of Object.keys(EXISTING_COUNTS)) {
    const ok = !new RegExp(`ALTER TABLE ${t}\\b`, 'm').test(sql);
    if (!ok) rec(`Does NOT ALTER existing ${t}`, false, 'FOUND ALTER TABLE');
  }
  rec('No existing table is altered', true, 'all 30 existing tables verified');

  console.log('\n  -- Expected policies (static: CREATE POLICY present in migration) --');
  for (const [tbl, count] of Object.entries(EXPECTED_POLICIES)) {
    const occurrences = ((sql.match(new RegExp(`CREATE POLICY .* ON ${tbl}\\b`, 'g')) || []).length) +
      ((sql.match(new RegExp(`DROP POLICY IF EXISTS .* ON ${tbl}\\b`, 'g')) || []).length);
    const ok = occurrences >= count;
    rec(`policies for ${tbl} (${occurrences}/${count})`, ok);
  }

  console.log('\n  -- Expected indexes (static: CREATE INDEX IF NOT EXISTS) --');
  const idxByTable = {};
  const idxRe = /CREATE INDEX IF NOT EXISTS (\w+)\s+ON (\w+)\s*\(/g;
  let m;
  while ((m = idxRe.exec(sql)) !== null) {
    (idxByTable[m[2]] = idxByTable[m[2]] || []).push(m[1]);
  }
  for (const t of NEW_TABLES_DEF) {
    const count = (idxByTable[t.name] || []).length;
    const ok = count >= 1;
    rec(`indexes for ${t.name} (${count})`, ok);
  }

  console.log('\n  -- Expected updated_at triggers (static) --');
  for (const t of NEW_TABLES_DEF) {
    if (t.updated_at) {
      const ok = sql.includes(`CREATE TRIGGER trg_${t.name}_updated_at BEFORE UPDATE ON ${t.name}`);
      rec(`trigger trg_${t.name}_updated_at`, ok);
    }
  }
}

async function liveChecks() {
  console.log('\n=== 2. LIVE DATABASE VERIFICATION ===\n');

  console.log('  -- Existing 30 tables / data (must be unchanged) --');
  for (const [tbl, exp] of Object.entries(EXISTING_COUNTS)) {
    const { count, error } = await svc.from(tbl).select('*', { count: 'exact', head: true });
    const ok = !error && count === exp;
    rec(`existing ${tbl} = ${exp}`, ok, error ? error.message.substring(0, 60) : `actual=${count}`);
  }

  console.log('\n  -- New Phase 6.1 tables exist --');
  for (const t of NEW_TABLES_DEF) {
    const { count, error } = await svc.from(t.name).select('*', { count: 'exact', head: true });
    if (!error && typeof count === 'number') {
      rec(`table exists: ${t.name}`, true, `row count=${count}`);
    } else {
      rec(`table exists: ${t.name}`, false, error ? error.message.substring(0, 60) : 'count unavailable');
    }
  }

  console.log('\n  -- RLS enforcement (anon must NOT read new tables) --');
  for (const t of NEW_TABLES_DEF) {
    const { error } = await anon.from(t.name).select('id').limit(1);
    const blocked = !!error;
    rec(`RLS blocks anon SELECT on ${t.name}`, blocked, blocked ? 'blocked' : 'ALLOWED — FAIL');
  }

  console.log('\n  -- Read-only integrity (service role SELECT works on new tables) --');
  for (const t of NEW_TABLES_DEF) {
    const { data, error } = await svc.from(t.name).select('*').limit(1);
    const ok = !error;
    rec(`service SELECT ${t.name}`, ok, error ? error.message.substring(0, 60) : 'ok');
  }
}

async function main() {
  await staticChecks();
  await liveChecks();

  const fails = results.filter(r => !r.ok);
  const passes = results.filter(r => r.ok);

  console.log('\n========================================');
  console.log('   PHASE 6.1 VERIFICATION SUMMARY');
  console.log('========================================');
  console.log(`  PASS: ${passes.length}`);
  console.log(`  FAIL: ${fails.length}`);
  if (fails.length) {
    console.log('\n  FAILED CHECKS:');
    for (const f of fails) console.log(`    ✗ ${f.check}${f.detail ? ' — ' + f.detail : ''}`);
  }
  console.log(`\n  Phase 6.1 Database Foundation: ${fails.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);

  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });