/**
 * Upload background images from src/assets/backgrounds/ to Cloudflare R2.
 *
 * Drop your image files (jpg, jpeg, png, webp, avif) into:
 *   src/assets/backgrounds/
 * Then run:
 *   node scripts/upload-backgrounds.mjs
 *
 * Each file is uploaded to the `undistracted-me-media` bucket under:
 *   backgrounds/<filename>          e.g. backgrounds/1.jpg
 *
 * Served publicly (zero egress) at:
 *   https://media.undistracted.me/backgrounds/<filename>
 *
 * IMPORTANT: `functions/_media/media.js` is a *static* manifest consumed by
 * /api/photos/curated — not a dynamic listing. After uploading new files you
 * must also add them to that manifest for the endpoint to serve them.
 *
 * To remove a background, delete it from R2:
 *   wrangler r2 object delete undistracted-me-media/backgrounds/<filename>
 *
 * Requirements:
 *   - wrangler installed and on PATH (or available via `npx wrangler`)
 *   - CLOUDFLARE_API_TOKEN env var (or run `wrangler login` once)
 *   - account_id set in wrangler.toml (already present)
 */

import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BACKGROUNDS_DIR = join(__dirname, '..', 'src', 'assets', 'backgrounds');
const BUCKET = 'undistracted-me-media';
const PUBLIC_BASE = 'https://media.undistracted.me';
const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

// Prefer `wrangler` on PATH, falling back to `npx wrangler` (downloads on first run).
function runWrangler(args) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const candidates = [['wrangler'], [npx, 'wrangler']];

  for (const cmd of candidates) {
    const res = spawnSync(cmd[0], [...cmd.slice(1), ...args], { encoding: 'utf8' });
    if (res.error && res.error.code === 'ENOENT') continue; // binary not found → try next
    return res;
  }
  throw new Error('wrangler is not installed and `npx wrangler` failed. Install with: bun add -g wrangler');
}

if (!process.env.CLOUDFLARE_API_TOKEN && !process.env.CLOUDFLARE_ACCOUNT_ID) {
  console.log('Note: no CLOUDFLARE_API_TOKEN set — relying on `wrangler login` if available.\n');
}

// ─── Main ────────────────────────────────────────────────────────────────────

let files;
try {
  files = (await readdir(BACKGROUNDS_DIR))
    .filter((f) => SUPPORTED_EXTS.has(extname(f).toLowerCase()));
} catch {
  console.error(`ERROR: Could not read ${BACKGROUNDS_DIR}`);
  console.error('Create the directory and add your image files first.');
  process.exit(1);
}

if (files.length === 0) {
  console.log('No image files found in src/assets/backgrounds/');
  console.log('Add .jpg/.png/.webp/.avif files and run again.');
  process.exit(0);
}

console.log(`\n🚀 Uploading ${files.length} background(s) to R2 (${BUCKET})…\n`);

const uploaded = [];
const failed = [];

for (const filename of files) {
  const filePath = join(BACKGROUNDS_DIR, filename);
  const ext = extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const key = `backgrounds/${filename}`;
  const objectPath = `${BUCKET}/${key}`;

  process.stdout.write(`  ${filename}: uploading…`);

  const res = runWrangler([
    'r2', 'object', 'put', objectPath,
    '--file', filePath,
    '--content-type', contentType,
    '--remote', // wrangler 4.x defaults r2 object put to --local; force real R2
    '--force',
  ]);

  if (res.status === 0) {
    console.log(' ✅');
    console.log(`     ${PUBLIC_BASE}/${key}`);
    uploaded.push({ filename, url: `${PUBLIC_BASE}/${key}` });
  } else {
    const detail = (res.stderr || res.stdout || '').trim().split('\n').pop();
    console.log(` ❌ upload failed: ${detail || `exit code ${res.status}`}`);
    failed.push(filename);
  }
}

console.log(`\n✅ Uploaded ${uploaded.length}/${files.length} file(s).`);
if (failed.length > 0) {
  console.log(`⚠️  Failed: ${failed.join(', ')}`);
}
console.log('\nRemember: /api/photos/curated serves from the static manifest in');
console.log('functions/_media/media.js — add any new files there too.\n');
