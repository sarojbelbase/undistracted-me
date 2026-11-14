/**
 * GET /audio/rain
 *
 * Returns the ambient rain audio URL. Previously listed blobs from Vercel
 * Blob (`rain/` prefix); now served from the static media manifest since the
 * asset still lives on Vercel Blob.
 */

import { assertStrictOrigin, json, corsHeaders } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';
import { RAIN_URL } from '../_media/media.js';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertStrictOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertStrictOrigin(request);
  if (rejected) return rejected;
  const limited = await rateLimit(env, request);
  if (limited) return limited;

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { request });
  }

  // Client-side cache for 1 hour
  return json({ url: RAIN_URL }, 200, {
    request,
    headers: { 'Cache-Control': 'private, max-age=3600' },
  });
}
