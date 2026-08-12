const fs = require('fs');
const { Client } = require('pg');

const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
const env = {};
raw.split('\n').forEach(l => { const m = l.trim().match(/^(\w+)=(.*)$/); if (m && m[2]) env[m[1]] = m[2]; });

const projectRef = 'bbfbfjrinknfrlxycovb';

async function tryConnect(host, port, user, password, label) {
  const client = new Client({
    host, port, user, password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    console.log(`${label}: CONNECTED`);
    // Try to reload schema
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log(`${label}: NOTIFY sent`);
    // Check if tables exist
    const { rows } = await client.query(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
    );
    console.log(`${label}: ${rows.length} tables found:`);
    rows.slice(0, 5).forEach(r => console.log(`  - ${r.tablename}`));
    if (rows.length > 5) console.log(`  ... and ${rows.length - 5} more`);
    await client.end();
    return true;
  } catch (e) {
    console.log(`${label}: ${e.message.substring(0, 80)}`);
    try { await client.end(); } catch {}
    return false;
  }
}

async function main() {
  const pass = env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Try connection pooler (Session mode)
  const ok1 = await tryConnect(
    `aws-0-ap-south-1.pooler.supabase.com`, 5432,
    `postgres.${projectRef}`, pass, 'SESSION'
  );
  if (ok1) return;
  
  // Try connection pooler (Transaction mode)
  const ok2 = await tryConnect(
    `aws-0-ap-south-1.pooler.supabase.com`, 6543,
    `postgres.${projectRef}`, pass, 'TRANSACT'
  );
  if (ok2) return;
  
  // Try direct connection
  const ok3 = await tryConnect(
    `db.${projectRef}.supabase.co`, 5432,
    `postgres`, pass, 'DIRECT'
  );
  if (ok3) return;
  
  console.log('\nAll connection attempts failed.');
  console.log('Database password is required (separate from API keys).');
  console.log('Find it in: Supabase Dashboard > Settings > Database > Database password');
}

main().catch(e => console.error(e.message));
