/**
 * GET /api/photos/curated
 *
 * Lists all images stored under the `backgrounds/` prefix in the project's
 * Vercel Blob store and returns them as photo objects.  No hardcoded list —
 * just upload or delete blobs and the endpoint reflects the change immediately.
 *
 * To add / replace photos:
 *   node scripts/upload-backgrounds.mjs          ← upload from src/assets/backgrounds/
 *   vercel blob put backgrounds/<name>.jpg <file> ← upload a single file via CLI
 *
 * CORS: allows GET from chrome-extension://, moz-extension://, and the
 * production origin so the extension can call this directly.
 *
 * Vercel env vars required:
 *   PHOTOS_API_KEY       — shared secret validated against X-API-Key header
 *   BLOB_READ_WRITE_TOKEN — auto-injected by Vercel when the store is linked
 */

import { list } from '@vercel/blob';
import { assertOrigin, assertApiKey } from '../_config.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;
  if (!assertApiKey(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }


  try {
    // List every blob under the backgrounds/ prefix.
    // BLOB_READ_WRITE_TOKEN is auto-injected by Vercel when the store is linked.
    const { blobs } = await list({
      prefix: 'backgrounds/',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    // Prefer the stable production URL; fall back to the current deployment URL.
    // Both expose /_vercel/image which Vercel Image Optimization uses to serve
    // resized WebP/AVIF variants on the fly — no extra infrastructure needed.
    const origin = process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : null;

    const photos = blobs.map(b => {
      const filename = b.pathname.split('/').pop();
      const id = filename.replace(/\.[^.]+$/, '');
      // thumb: ~200 px wide WebP served by Vercel Image Optimization.
      // Falls back to the full URL when running locally (no /_vercel/image).
      const thumb = origin
        ? `${origin}/_vercel/image?url=${encodeURIComponent(b.url)}&w=200&q=70`
        : b.url;
      return {
        id,
        url: b.url,
        regular: b.url,
        small: b.url,
        thumb,
        color: '#18191b',
      };
    });

    // Client-side cache for 1 hour; no CDN caching — endpoint is key-authenticated
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).json(photos);
  } catch {
    return res.status(502).json({ error: 'Failed to list backgrounds' });
  }
}

