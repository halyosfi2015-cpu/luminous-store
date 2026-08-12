const fs = require('fs');
const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
const env = {};
raw.split('\n').forEach(l => { const m = l.trim().match(/^(\w+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; });
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const host = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname;

async function main() {
  // Check PostgREST configuration - what schemas are exposed?
  const r = await fetch(`https://${host}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' }
  });
  const spec = await r.json();
  
  console.log('PostgREST version:', spec.info?.version || 'unknown');
  console.log('Title:', spec.info?.title || 'none');
  console.log('Schemas:', JSON.stringify(spec.servers || []));
  console.log('Paths:', Object.keys(spec.paths || {}));
  
  // Check the raw response headers
  console.log('\nResponse headers:');
  r.headers.forEach((v, k) => {
    if (k.startsWith('content') || k.startsWith('x-')) console.log(`  ${k}: ${v}`);
  });
}

main().catch(e => console.error(e.message));
