/**
 * GET /lookaway/messages
 *
 * Returns the LookAway + website-blocker message catalog. The catalog was
 * previously bundled into the extension (~40 kB of prose); it now lives
 * server-side and is fetched on demand so the client bundle stays lean.
 *
 * The messages are non-sensitive public content, so this endpoint only
 * enforces the CORS origin check (no API key) — it must work for the website
 * build too, where no key is configured.
 */

import { assertStrictOrigin, json, corsHeaders } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';
import { MESSAGES } from '../../src/data/lookawayMessages.js';

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

  // Public content — cache at the CDN for a day.
  return json(MESSAGES, 200, {
    request,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
