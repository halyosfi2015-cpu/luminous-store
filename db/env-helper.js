const fs = require('fs');

function loadEnv() {
  const raw = fs.readFileSync('.env.local', 'utf8').replace(/^\uFEFF/, '');
  const env = {};
  raw.split('\n').forEach(l => {
    const m = l.trim().match(/^(\w+)=(.*)$/);
    if (m && m[2]) env[m[1]] = m[2];
  });
  return env;
}

module.exports = { loadEnv };
