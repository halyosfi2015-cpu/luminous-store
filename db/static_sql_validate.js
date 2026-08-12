const fs = require('fs');
const path = require('path');
const pkg = require('pg-query-emscripten');
const Module = pkg.default || pkg;

function splitSQL(sql) {
  const stmts = [];
  let buf = '';
  let i = 0;
  let inSingle = false;
  let inDouble = false;
  let inDollar = false;
  let inLineComment = false;
  let inBlockComment = false;
  let dollarTag = '';

  while (i < sql.length) {
    const c = sql[i];
    const c2 = sql[i + 1];

    if (inLineComment) {
      if (c === '\n') inLineComment = false;
      buf += c;
      i++;
      continue;
    }
    if (inBlockComment) {
      if (c === '*' && c2 === '/') { inBlockComment = false; buf += '*/'; i += 2; continue; }
      buf += c;
      i++;
      continue;
    }
    if (inDollar) {
      if (sql.startsWith(dollarTag, i)) {
        inDollar = false;
        buf += dollarTag;
        i += dollarTag.length;
        dollarTag = '';
        continue;
      }
      buf += c;
      i++;
      continue;
    }
    if (inSingle) {
      if (c === "'" && c2 === "'") { buf += "''"; i += 2; continue; }
      if (c === "'") { inSingle = false; buf += c; i++; continue; }
      buf += c;
      i++;
      continue;
    }
    if (inDouble) {
      if (c === '"' && c2 === '"') { buf += '""'; i += 2; continue; }
      if (c === '"') { inDouble = false; buf += c; i++; continue; }
      buf += c;
      i++;
      continue;
    }

    if (c === '-' && c2 === '-') { inLineComment = true; buf += '--'; i += 2; continue; }
    if (c === '/' && c2 === '*') { inBlockComment = true; buf += '/*'; i += 2; continue; }
    if (c === "'") { inSingle = true; buf += c; i++; continue; }
    if (c === '"') { inDouble = true; buf += c; i++; continue; }
    if (c === '$') {
      const m = sql.substring(i).match(/^\$[A-Za-z0-9_]*\$/);
      if (m) {
        inDollar = true;
        dollarTag = m[0];
        buf += dollarTag;
        i += dollarTag.length;
        continue;
      }
    }
    if (c === ';') {
      const trimmed = buf.trim();
      if (trimmed) stmts.push(buf);
      buf = '';
      i++;
      continue;
    }

    buf += c;
    i++;
  }
  const trimmed = buf.trim();
  if (trimmed) stmts.push(buf);
  return stmts;
}

(async () => {
  const parser = await new Module();
  const migration = fs.readFileSync(
    path.join(__dirname, 'migration_phase_6_1_future_foundation.sql'),
    'utf8'
  );

  const statements = splitSQL(migration);
  console.log('=== STATIC SQL VALIDATION ===');
  console.log(`Statements parsed: ${statements.length}`);

  let errors = 0;
  const errList = [];

  for (let idx = 0; idx < statements.length; idx++) {
    const stmt = statements[idx];
    try {
      parser.parse(stmt);
    } catch (e) {
      errors++;
      errList.push({
        idx: idx + 1,
        stmt: stmt.substring(0, 200).replace(/\s+/g, ' ').trim(),
        error: e.message,
      });
    }
  }

  console.log(`Errors: ${errors}`);

  if (errors > 0) {
    console.log('\n--- ERROR DETAILS ---');
    for (const e of errList) {
      console.log(`\n  ✗ [stmt #${e.idx}] ${e.error}`);
      console.log(`    → ${e.stmt}...`);
    }
    process.exit(1);
  }

  console.log('\n✓ All statements parsed successfully');
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
