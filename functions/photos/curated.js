/**
 * GET /photos/curated
 *
 * Returns the curated ambient background photos. Previously listed blobs from
 * Vercel Blob (`backgrounds/` prefix) and generated `/_vercel/image` resize
 * variants; now served from the static media manifest with every size variant
 * equal to the manifest URL (the old `/_vercel/image` resizing is dropped).
 *
 * CORS: allows GET from chrome-extension://, moz-extension://, and the
 * production origin so the extension can call this directly.
 */

import { assertOrigin, assertApiKey, json, corsHeaders } from '../_config.js';
import { BACKGROUNDS } from '../_media/media.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertOrigin(request);
  if (rejected) return rejected;
  const keyRejected = assertApiKey(request, env);
  if (keyRejected) return keyRejected;

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { request });
  }

  const photos = BACKGROUNDS.map((b) => ({
    id: b.id,
    url: b.url,
    regular: b.url,
    small: b.thumb || b.url,
    thumb: b.thumb || b.url,
    color: '#18191b',
  }));

  // Client-side cache for 1 hour; no CDN caching — endpoint is key-authenticated
  return json(photos, 200, {
    request,
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
}
