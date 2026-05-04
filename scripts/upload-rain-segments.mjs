#!/usr/bin/env node
/**
 * scripts/upload-rain-segments.mjs
 *
 * One-time script to upload all rain segments to Vercel Blob Storage.
 * Run with:
 *   BLOB_READ_WRITE_TOKEN=... node scripts/upload-rain-segments.mjs
 */

import { put, del, list } from "@vercel/blob";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const SEGMENTS_DIR = "./public/sounds/segments";

const files = readdirSync(SEGMENTS_DIR)
  .filter((f) => f.startsWith("rain_") && (f.endsWith(".m4a") || f.endsWith(".mp3") || f.endsWith(".wav")))
  .sort();

console.log(`Uploading ${files.length} segments to Vercel Blob...\n`);

const { blobs } = await list({ prefix: 'rain/' });
for (const blob of blobs) {
  if (blob.url.endsWith('.wav')) {
    await del(blob.url);
    console.log(`Deleted old blob: ${blob.url}`);
  }
}

for (const file of files) {
  const buf = readFileSync(join(SEGMENTS_DIR, file));
  const contentType = file.endsWith(".m4a") ? "audio/mp4" 
                    : file.endsWith(".mp3") ? "audio/mpeg" 
                    : "audio/wav";

  const { url } = await put(`rain/${file}`, buf, {
    access: "public",
    contentType,
  });
  process.stdout.write(`  ✓ ${file} → ${url}\n`);
}

console.log("\nDone! The API will automatically pick up the new files.");
