const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
const env = {};
raw.split('\n').forEach(l => {
  const m = l.trim().match(/^(\w+)=(.*)$/);
  if (m && m[2]) env[m[1]] = m[2];
});

console.log('URL:', env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has /rest:', env.NEXT_PUBLIC_SUPABASE_URL?.includes('/rest'));

const s = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

s.from('products').select('id').limit(1).then(r => {
  console.log('SELECT:', r.error ? r.error.message : 'OK, rows=' + r.data.length);
  // Test insert
  return s.from('site_settings').upsert({ key: '_test_', value: { ok: true } }).select();
}).then(r => {
  if (r) console.log('UPSERT:', r.error ? r.error.message : 'OK');
  return s.from('site_settings').delete().eq('key', '_test_');
}).then(r => {
  if (r) console.log('DELETE:', r.error ? r.error.message : 'OK');
  console.log('\nCONNECTION: SUCCESS');
}).catch(e => console.error('FATAL:', e.message));
