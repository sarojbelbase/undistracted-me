/**
 * Generate and upload Focus Mode background thumbnails to Cloudflare R2.
 *
 * The full-res backgrounds live in R2 (`media.undistracted.me/backgrounds/N.jpg`,
 * ~2–6.5 MB each). Focus Mode's picker grid was downloading those full-res files
 * as "thumbnails". This script downscales each to a ~480px WebP (~20–40 KB) and
 * uploads it to R2 as `backgrounds/thumbs/N.webp`, so the picker loads fast.
 *
 * Run:  node scripts/make-thumbnails.mjs            # all backgrounds
 *       node scripts/make-thumbnails.mjs 1 5 12     # only those ids
 *
 * Requirements:
 *   - cwebp on PATH (`brew install webp`)
 *   - wrangler installed and logged in with R2 write (pages:write / r2 perms)
 *
 * The full-res image is downloaded from its public R2 URL, so no extra R2 read
 * credentials are needed — only `wrangler r2 object put` for the upload.
 */

import { spawnSync } from 'node:child_process';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const MANIFEST = join(__dirname, '..', 'functions', '_media', 'media.js');
const BUCKET = 'undistracted-me-media';
const PUBLIC_BASE = 'https://media.undistracted.me';
const THUMB_WIDTH = 480;   // px — picker tiles are ~100px, 480 is plenty (2x retina)
const THUMB_QUALITY = 75;  // webp quality

// Only process the ids passed on the command line, if any.
const only = process.argv.slice(2);

// ─── Helpers ────────────────────────────────────────────────────────────────

function runWrangler(args) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const candidates = [['wrangler'], [npx, 'wrangler']];
  for (const cmd of candidates) {
    const res = spawnSync(cmd[0], [...cmd.slice(1), ...args], { encoding: 'utf8' });
    if (res.error && res.error.code === 'ENOENT') continue; // binary not found → try next
    return res;
  }
  throw new Error('wrangler is not installed. Install with: bun add -g wrangler');
}

function runCwebp(args) {
  const res = spawnSync('cwebp', args, { encoding: 'utf8' });
  if (res.error && res.error.code === 'ENOENT') {
    throw new Error('cwebp not found. Install with: brew install webp');
  }
  return res;
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download failed ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

// ─── Extract background URLs from the static manifest (keeps it in sync) ────

const manifestSrc = await readFile(MANIFEST, 'utf8');
const urls = [
  ...manifestSrc.matchAll(/https:\/\/media\.undistracted\.me\/backgrounds\/[\w.-]+\.(?:jpe?g|png|webp|avif)/gi),
].map((m) => m[0]);

const unique = [...new Set(urls)];
if (unique.length === 0) {
  console.error('No background URLs found in api/_media/media.js');
  process.exit(1);
}

const jobs = unique
  .filter((url) => !url.includes('/thumbs/')) // never reprocess thumbnails themselves
  .map((url) => {
    const name = basename(url, extname(url));
    return { name, url, thumbUrl: `${PUBLIC_BASE}/backgrounds/thumbs/${name}.webp` };
  })
  .filter((j) => only.length === 0 || only.includes(j.name));

if (jobs.length === 0) {
  console.error('No matching backgrounds. Check the ids passed as arguments.');
  process.exit(1);
}

console.log(`\n🖼  Generating ${jobs.length} thumbnail(s) at ${THUMB_WIDTH}px (webp q${THUMB_QUALITY})…\n`);

const tmp = await mkdtemp(join(tmpdir(), 'bg-thumbs-'));
const uploaded = [];
const failed = [];

try {
  for (const job of jobs) {
    const srcFile = join(tmp, `${job.name}${extname(new URL(job.url).pathname)}`);
    const outFile = join(tmp, `${job.name}.webp`);
    const thumbKey = `backgrounds/thumbs/${job.name}.webp`;

    process.stdout.write(`  ${job.name}: `);
    try {
      await download(job.url, srcFile);

      const c = runCwebp([
        '-quiet',
        '-resize', String(THUMB_WIDTH), '0',
        '-q', String(THUMB_QUALITY),
        '-m', '6',
        srcFile,
        '-o', outFile,
      ]);
      if (c.status !== 0) throw new Error(c.stderr?.trim() || `cwebp exit ${c.status}`);

      const put = runWrangler([
        'r2', 'object', 'put', `${BUCKET}/${thumbKey}`,
        '--file', outFile,
        '--content-type', 'image/webp',
        '--remote', // wrangler 4.x defaults r2 object put to --local; force real R2
        '--force',
      ]);
      if (put.status !== 0) {
        const detail = (put.stderr || put.stdout || '').trim().split('\n').pop();
        throw new Error(detail || `r2 put exit ${put.status}`);
      }

      console.log(`✅ ${job.thumbUrl}`);
      uploaded.push(job.thumbUrl);
    } catch (err) {
      console.log(`❌ ${err.message}`);
      failed.push(job.name);
    }
  }
} finally {
  await rm(tmp, { recursive: true, force: true });
}

console.log(`\n✅ Uploaded ${uploaded.length}/${jobs.length} thumbnail(s).`);
if (failed.length > 0) console.log(`⚠️  Failed: ${failed.join(', ')}`);
console.log('\nNext: make sure api/_media/media.js lists the matching `thumb`');
console.log('URL for each background (it already should if you ran the full setup).\n');
