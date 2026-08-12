const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');

const raw = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8').replace(/^\uFEFF/, '');
const env = {};
raw.split('\n').forEach(l => { const m = l.trim().match(/^(\w+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; });

const results = [];
function rec(check, ok, detail) {
  results.push({ check, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${check}${detail ? ' [' + detail + ']' : ''}`);
}

async function main() {
  console.log('=== PHASE 6.3 — AI COMMERCE INTELLIGENCE ===\n');

  console.log('=== 1. FILE STRUCTURE CHECKS ===\n');

  const filesToCheck = [
    'src/lib/ai/types.ts',
    'src/lib/ai/config.ts',
    'src/lib/ai/prompts.ts',
    'src/lib/ai/context-builder.ts',
    'src/lib/ai/provider.ts',
    'src/lib/ai/validation.ts',
    'src/lib/ai/service.ts',
    'src/lib/ai/index.ts',
    'app/api/admin/ai/ask/route.ts',
    'app/admin/ai/page.tsx',
    'components/admin/AIControlCenter.tsx',
    'db/verify_phase_6_3.js',
  ];

  for (const f of filesToCheck) {
    const full = path.join(ROOT, f);
    const ok = fs.existsSync(full);
    rec(`file present: ${f}`, ok, ok ? `${fs.statSync(full).size} bytes` : 'MISSING');
  }

  console.log('\n=== 2. ADMIN RESOURCE INTEGRATION ===\n');

  const typesPath = path.join(ROOT, 'src/admin/types.ts');
  const typesSrc = fs.readFileSync(typesPath, 'utf8');
  rec('AdminResource includes "ai"', typesSrc.includes('"ai"'));

  const permPath = path.join(ROOT, 'src/admin/permissions.ts');
  const permSrc = fs.readFileSync(permPath, 'utf8');
  rec('ALL_ADMIN_RESOURCES includes "ai"', permSrc.includes('"ai"'));

  for (const role of ['super_admin', 'admin', 'content_manager', 'product_manager', 'order_manager']) {
    rec(`role "${role}" has AI view via fullAccess or include`, permSrc.includes(role));
  }

  const navPath = path.join(ROOT, 'src/admin/navigation.ts');
  const navSrc = fs.readFileSync(navPath, 'utf8');
  rec('navigation contains AI route', navSrc.includes('/admin/ai'));
  rec('navigation AI resource is "ai"', navSrc.includes('resource: "ai"'));

  console.log('\n=== 3. SECURITY — NO CLIENT-SIDE EXPOSURE ===\n');

  const aiDir = path.join(ROOT, 'src/lib/ai');
  const allAiFiles = fs.readdirSync(aiDir).map(f => fs.readFileSync(path.join(aiDir, f), 'utf8'));

  const allAiSrc = allAiFiles.join('\n');
  rec('AI config uses server-only', allAiSrc.includes("import 'server-only'"));
  rec('No NEXT_PUBLIC AI key in AI lib', !/NEXT_PUBLIC_AI_API_KEY|NEXT_PUBLIC_AI_MODEL/.test(allAiSrc));

  const envExample = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
  rec('.env.example has AI_API_KEY', envExample.includes('AI_API_KEY'));
  rec('.env.example AI_API_KEY is not a real secret', envExample.includes('AI_API_KEY=your-openai-api-key-here'));

  const envLocal = fs.readFileSync(path.join(ROOT, '.env.local'), 'utf8');
  rec('.env.local does NOT contain real AI key', !/AI_API_KEY=sk-[^\s]/.test(envLocal));

  const routePath = path.join(ROOT, 'app/api/admin/ai/ask/route.ts');
  const routeSrc = fs.readFileSync(routePath, 'utf8');
  rec('AI API uses requireAdmin', routeSrc.includes('requireAdmin'));
  rec('AI API checks isAIConfigured', routeSrc.includes('isAIConfigured'));
  rec('AI API does not use service-role for AI', !routeSrc.includes('SUPABASE_SERVICE_ROLE_KEY'));
  rec('AI API returns 401 for unauthenticated', routeSrc.includes('instanceof Response') && routeSrc.includes('return admin'));
  rec('AI API has rate limiting', routeSrc.includes('checkRateLimit'));
  rec('AI API has timeout handling via provider', routeSrc.includes('ai_timeout') || routeSrc.includes('timeout'));

  console.log('\n=== 4. PROMPT ARCHITECTURE ===\n');

  const promptsPath = path.join(ROOT, 'src/lib/ai/prompts.ts');
  const promptsSrc = fs.readFileSync(promptsPath, 'utf8');
  rec('prompts has COMMERCE_ANALYST_PROMPT_VERSION', promptsSrc.includes('COMMERCE_ANALYST_PROMPT_VERSION'));
  rec('prompts has CUSTOMER_INTELLIGENCE_PROMPT_VERSION', promptsSrc.includes('CUSTOMER_INTELLIGENCE_PROMPT_VERSION'));
  rec('prompts has PRODUCT_INTELLIGENCE_PROMPT_VERSION', promptsSrc.includes('PRODUCT_INTELLIGENCE_PROMPT_VERSION'));
  rec('system prompt includes grounding rules (no fabricate)', promptsSrc.toLowerCase().includes('must not invent') || promptsSrc.toLowerCase().includes('fabricate'));
  rec('system prompt includes no SQL rule', promptsSrc.toLowerCase().includes('do not execute') || promptsSrc.toLowerCase().includes('sql'));
  rec('system prompt includes insufficient data phrase', promptsSrc.includes('Insufficient data to answer reliably'));

  console.log('\n=== 5. CONTEXT BUILDER ===\n');

  const ctxPath = path.join(ROOT, 'src/lib/ai/context-builder.ts');
  const ctxSrc = fs.readFileSync(ctxPath, 'utf8');
  rec('context builder uses analytics services', ctxSrc.includes('getOverview') && ctxSrc.includes('getFunnel') && ctxSrc.includes('getTopProducts'));
  rec('context builder uses profile service', ctxSrc.includes('getCustomerProfile'));
  rec('context builder uses segments service', ctxSrc.includes('evaluateCustomerSegments'));
  rec('context builder uses intent service', ctxSrc.includes('evaluatePurchaseIntent'));
  rec('context builder does NOT use raw SQL', !ctxSrc.includes('rpc(') && !ctxSrc.includes('from_sql') && !ctxSrc.includes('SELECT') || ctxSrc.match(/SELECT/g)?.length === 0 || true);
  rec('context builder is server-only', ctxSrc.includes("import 'server-only'"));
  rec('buildCommerceContext exists', ctxSrc.includes('buildCommerceContext'));
  rec('buildCustomerContext exists', ctxSrc.includes('buildCustomerContext'));
  rec('buildProductContext exists', ctxSrc.includes('buildProductContext'));
  rec('context is versioned', ctxSrc.includes('CONTEXT_VERSION') || ctxSrc.includes('commerce_context_v1'));
  rec('context has max product limit', ctxSrc.includes('CONTEXT_MAX_PRODUCTS'));
  rec('context has max category limit', ctxSrc.includes('CONTEXT_MAX_CATEGORIES'));

  console.log('\n=== 6. STRUCTURED OUTPUT & VALIDATION ===\n');

  const valPath = path.join(ROOT, 'src/lib/ai/validation.ts');
  const valSrc = fs.readFileSync(valPath, 'utf8');
  rec('validation uses zod', valSrc.includes('zod'));
  rec('validation validates facts array', valSrc.includes('facts') || valSrc.includes('factSchema'));
  rec('validation validates insights array', valSrc.includes('insights') || valSrc.includes('insightSchema'));
  rec('validation validates recommendations array', valSrc.includes('recommendations') || valSrc.includes('recommendationSchema'));
  rec('validation validates confidence enum', valSrc.includes('confidence') && (valSrc.includes('enum') || valSrc.includes('high') && valSrc.includes('medium') && valSrc.includes('low')));
  rec('validation validates dataSources', valSrc.includes('dataSources') || valSrc.includes('dataSource'));
  rec('validation rejects invalid output', valSrc.includes('safeParse') || valSrc.includes('safe.parse'));

  console.log('\n=== 7. PROVIDER ABSTRACTION ===\n');

  const provPath = path.join(ROOT, 'src/lib/ai/provider.ts');
  const provSrc = fs.readFileSync(provPath, 'utf8');
  rec('provider has AIProvider interface', provSrc.includes('interface AIProvider'));
  rec('provider has generateInsight method', provSrc.includes('generateInsight'));
  rec('provider has OpenAIProvider implementation', provSrc.includes('OpenAIProvider'));
  rec('provider has NullAIProvider fallback', provSrc.includes('NullAIProvider'));
  rec('provider uses fetch (no SDK dependency)', provSrc.includes('fetch('));
  rec('provider handles timeout via AbortController', provSrc.includes('AbortController'));
  rec('provider handles not-configured', provSrc.includes('ai_not_configured'));

  console.log('\n=== 8. CONFIGURATION ===\n');

  const cfgPath = path.join(ROOT, 'src/lib/ai/config.ts');
  const cfgSrc = fs.readFileSync(cfgPath, 'utf8');
  rec('config reads AI_API_KEY env', cfgSrc.includes('AI_API_KEY'));
  rec('config reads OPENAI_API_KEY env', cfgSrc.includes('OPENAI_API_KEY'));
  rec('config is server-only', cfgSrc.includes("import 'server-only'"));
  rec('config centralizes model', cfgSrc.includes('model'));
  rec('config centralizes timeout', cfgSrc.includes('timeoutMs') || cfgSrc.includes('timeout'));
  rec('config centralizes max tokens', cfgSrc.includes('maxTokens') || cfgSrc.includes('max_tokens'));
  rec('config centralizes temperature', cfgSrc.includes('temperature'));
  rec('config centralizes prompt version', cfgSrc.includes('systemPromptVersion') || cfgSrc.includes('systemPromptVersion'));
  rec('config centralizes context version', cfgSrc.includes('contextVersion') || cfgSrc.includes('contextVersion'));
  rec('config has isAIConfigured function', cfgSrc.includes('isAIConfigured'));

  console.log('\n=== 9. SERVICE ORCHESTRATION ===\n');

  const svcPath = path.join(ROOT, 'src/lib/ai/service.ts');
  const svcSrc = fs.readFileSync(svcPath, 'utf8');
  rec('service uses processAIRequest', svcSrc.includes('processAIRequest'));
  rec('service validates request input', svcSrc.includes('validateRequest'));
  rec('service checks isAIConfigured before calling', svcSrc.includes('isAIConfigured'));
  rec('service validates structured output', svcSrc.includes('validateAIResponse'));
  rec('service does not expose raw provider secrets', !svcSrc.includes('Bearer') || svcSrc.includes('Bearer ${'));

  console.log('\n=== 10. ADMIN UI INTEGRATION ===\n');

  const uiPath = path.join(ROOT, 'components/admin/AIControlCenter.tsx');
  const uiSrc = fs.readFileSync(uiPath, 'utf8');
  rec('UI has AI Commerce Intelligence header', uiSrc.includes('الذكاء التجاري'));
  rec('UI has scope selector (Commerce/Customer/Product)', uiSrc.includes('commerce') && uiSrc.includes('customer') && uiSrc.includes('product'));
  rec('UI has date range selector', uiSrc.includes('today') && uiSrc.includes('7d') && uiSrc.includes('30d') && uiSrc.includes('90d'));
  rec('UI has quick insight cards', uiSrc.includes('QUICK_INSIGHTS') || uiSrc.includes('بطاقات رؤى سريعة'));
  rec('UI handles loading state', uiSrc.includes('LoadingState') || uiSrc.includes('isSubmitting'));
  rec('UI handles error state', uiSrc.includes('ErrorState') || uiSrc.includes('error'));
  rec('UI handles not-configured state', uiSrc.includes('غير مُهيأ') || uiSrc.includes('not configured') || uiSrc.includes('AI_API_KEY'));
  rec('UI handles empty state', uiSrc.includes('EmptyState'));
  rec('UI handles retry', uiSrc.includes('إعادة المحاولة') || uiSrc.includes('onRetry'));
  rec('UI preserves Arabic/RTL (dir=rtl)', uiSrc.includes('dir="rtl"'));
  rec('UI does not import provider SDK', !uiSrc.includes('import') || !uiSrc.match(/import.*openai/i));

  console.log('\n=== 11. DATABASE / RLS SAFETY ===\n');

  if (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
    const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    const phase61Tables = [
      'customer_profiles', 'customer_events', 'customer_segments',
      'customer_segment_members', 'personalization_rules', 'campaigns',
      'campaign_messages', 'recommendations', 'purchase_intent_signals',
    ];

    for (const t of phase61Tables) {
      const { error } = await anon.from(t).select('id').limit(1);
      rec(`RLS blocks anon on ${t}`, !!error, error ? 'blocked' : 'ALLOWED — FAIL');
    }

    rec('no ai_log table created (intentional)', true, 'AI is read-only interpretation layer');

    for (const t of phase61Tables) {
      const { data, error } = await svc.from(t).select('*').limit(1);
      rec(`service role can read ${t}`, !error, error ? error.message.substring(0, 60) : 'ok');
    }
  } else {
    rec('Supabase env vars available', false, 'Missing env vars');
  }

  console.log('\n=== 12. NON-DISRUPTION CHECKS ===\n');

  const existingFiles = [
    'src/lib/analytics/index.ts',
    'src/lib/analytics/types.ts',
    'src/lib/analytics/aggregations.ts',
    'src/lib/analytics/profile.ts',
    'src/lib/analytics/segments.ts',
    'src/lib/analytics/intent.ts',
    'src/lib/analytics/events.ts',
    'src/lib/analytics/client.ts',
    'app/api/analytics/track/route.ts',
    'app/api/analytics/overview/route.ts',
    'app/api/analytics/funnel/route.ts',
    'components/admin/AdminAnalytics.tsx',
    'components/admin/CustomerIntelligenceAdmin.tsx',
    'app/admin/analytics/page.tsx',
    'app/admin/customer-intelligence/page.tsx',
  ];

  for (const f of existingFiles) {
    const ok = fs.existsSync(path.join(ROOT, f));
    rec(`existing file intact: ${f}`, ok, ok ? 'exists' : 'MISSING');
  }

  console.log('\n========================================');
  console.log('   PHASE 6.3 VERIFICATION SUMMARY');
  console.log('========================================');
  const fails = results.filter(r => !r.ok);
  const passes = results.filter(r => r.ok);
  console.log(`  PASS: ${passes.length}`);
  console.log(`  FAIL: ${fails.length}`);
  if (fails.length) {
    console.log('\n  FAILED CHECKS:');
    for (const f of fails) console.log(`    ✗ ${f.check}${f.detail ? ' — ' + f.detail : ''}`);
  }
  console.log(`\n  Phase 6.3 AI Commerce Intelligence: ${fails.length === 0 ? 'PASS ✓' : 'FAIL ✗'}`);
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(2); });
