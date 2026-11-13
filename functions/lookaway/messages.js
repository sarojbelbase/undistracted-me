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

import { assertOrigin, json, corsHeaders } from '../_config.js';
import { MESSAGES } from '../../src/data/lookawayMessages.js';

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertOrigin(request);
  if (rejected) return rejected;

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { request });
  }

  // Public content — cache at the CDN for a day.
  return json(MESSAGES, 200, {
    request,
    headers: { 'Cache-Control': 'public, max-age=86400' },
  });
}
