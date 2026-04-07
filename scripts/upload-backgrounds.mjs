/**
 * Upload background images from src/assets/backgrounds/ to Vercel Blob.
 *
 * Drop your image files (jpg, jpeg, png, webp, avif) into:
 *   src/assets/backgrounds/
 * Then run:
 *   node --env-file=.env.local scripts/upload-backgrounds.mjs
 *
 * Each file is uploaded to:
 *   backgrounds/<filename>          e.g. backgrounds/mountain-dawn.jpg
 *
 * After uploading, the /api/photos/curated endpoint automatically reflects the
 * new files via @vercel/blob list() — no code changes required.
 *
 * To remove a background, delete it from the Blob store:
 *   vercel blob del backgrounds/<filename>
 *
 * Requirements:
 *   BLOB_READ_WRITE_TOKEN — auto-pulled via `vercel env pull .env.local`
 */

import { put } from '@vercel/blob';
import { readdir, readFile } from 'node:fs/promises';
import { join, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const BACKGROUNDS_DIR = join(__dirname, '..', 'src', 'assets', 'backgrounds');
const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif']);

const CONTENT_TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
};

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error('ERROR: BLOB_READ_WRITE_TOKEN env var is required.');
  console.error('Run: vercel env pull .env.local  then  node --env-file=.env.local scripts/upload-backgrounds.mjs');
  process.exit(1);
}

// ─── Main ────────────────────────────────────────────────────────────────────

let files;
try {
  files = (await readdir(BACKGROUNDS_DIR))
    .filter(f => SUPPORTED_EXTS.has(extname(f).toLowerCase()));
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

console.log(`\n🚀 Uploading ${files.length} background(s) to Vercel Blob…\n`);

const uploaded = [];
const failed = [];

for (const filename of files) {
  const filePath = join(BACKGROUNDS_DIR, filename);
  const ext = extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const blobPathname = `backgrounds/${filename}`;

  process.stdout.write(`  ${filename}: reading…`);

  let data;
  try {
    data = await readFile(filePath);
  } catch (err) {
    console.log(` ❌ read failed: ${err.message}`);
    failed.push(filename);
    continue;
  }

  process.stdout.write(' uploading…');

  try {
    const blob = await put(blobPathname, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,   // keep deterministic filenames
    });
    console.log(` ✅`);
    console.log(`     ${blob.url}`);
    uploaded.push({ filename, url: blob.url });
  } catch (err) {
    console.log(` ❌ upload failed: ${err.message}`);
    failed.push(filename);
  }
}

console.log(`\n✅ Uploaded ${uploaded.length}/${files.length} file(s).`);
if (failed.length > 0) {
  console.log(`⚠️  Failed: ${failed.join(', ')}`);
}
console.log('\nThe /api/photos/curated endpoint now serves these automatically.');
console.log('No code changes needed — the endpoint lists blobs dynamically.\n');

