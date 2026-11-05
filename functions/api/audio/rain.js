/**
 * GET /api/audio/rain
 *
 * Returns the ambient rain audio URL. Previously listed blobs from Vercel
 * Blob (`rain/` prefix); now served from the static media manifest since the
 * asset still lives on Vercel Blob.
 */

import { assertOrigin, assertApiKey, json, corsHeaders } from '../../_config.js';
import { RAIN_URL } from '../../_media/media.js';

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

  // Client-side cache for 1 hour
  return json({ url: RAIN_URL }, 200, {
    request,
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
}
