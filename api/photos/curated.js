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
import { ALLOWED_ORIGINS } from '../_config.js';


const authenticate = (req, res) => {
  const expected = process.env.PHOTOS_API_KEY;
  if (!expected) return true; // auth disabled in dev / test
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

const cors = (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
  res.setHeader('Vary', 'Origin');
};

export default async function handler(req, res) {
  cors(req, res);

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!authenticate(req, res)) return;

  try {
    // List every blob under the backgrounds/ prefix.
    // BLOB_READ_WRITE_TOKEN is auto-injected by Vercel when the store is linked.
    const { blobs } = await list({
      prefix: 'backgrounds/',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const photos = blobs.map(b => {
      const filename = b.pathname.split('/').pop();       // 'mountain-dawn.jpg'
      const id = filename.replace(/\.[^.]+$/, '');       // 'mountain-dawn'
      return {
        id,
        url: b.url,
        regular: b.url,
        small: b.url,
        color: '#18191b',
      };
    });

    // Short CDN cache — reflects new uploads within an hour without a redeploy.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=3600');
    return res.status(200).json(photos);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to list backgrounds', detail: err.message });
  }
}

