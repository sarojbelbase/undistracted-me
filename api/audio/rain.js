/**
 * GET /api/audio/rain
 *
 * Lists all audio segments stored under the `rain/` prefix in the project's
 * Vercel Blob store.
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
    const { blobs } = await list({
      prefix: 'rain/',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    const segments = blobs.map(b => b.url);

    // Client-side cache for 1 hour
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).json({ segments, segmentDuration: 30 });
  } catch {
    return res.status(502).json({ error: 'Failed to list rain segments' });
  }
}
