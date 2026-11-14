// Publish / sign the Firefox extension via `web-ext sign`.
// Usage: bun scripts/publish-firefox.mjs [listed|unlisted]   (default: listed)
//
//   listed   → submit this version to addons.mozilla.org for public review
//   unlisted → self-distribute: returns a signed, installable .xpi (no review)
//
// Reads AMO_JWT_ISSUER and AMO_JWT_SECRET from .env (or the environment).
// Credentials: https://addons.mozilla.org/developers/addon/api/key/
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';

// Minimal .env loader (values only set if not already present in the environment).
const envPath = new URL('../.env', import.meta.url);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const channel = process.argv[2] === 'unlisted' ? 'unlisted' : 'listed';
const issuer = process.env.AMO_JWT_ISSUER;
const secret = process.env.AMO_JWT_SECRET;

if (!issuer || !secret) {
  console.error('✗ Missing AMO_JWT_ISSUER / AMO_JWT_SECRET. Add them to .env (see .env.example).');
  process.exit(1);
}

const args = [
  'web-ext', 'sign',
  '--source-dir', 'dist-firefox',
  '--channel', channel,
  '--api-key', issuer,
  '--api-secret', secret,
  '--artifacts-dir', 'builds',
  '--timeout', '600000',
];

console.log(`\n→ web-ext sign (channel=${channel})\n`);
const res = spawnSync('bunx', args, { stdio: 'inherit' });
if (res.error) {
  console.error('✗', res.error.message);
  process.exit(1);
}
process.exit(res.status ?? 1);
