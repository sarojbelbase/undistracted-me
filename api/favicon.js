/**
 * GET /favicon?domain=example.com&sz=64
 *
 * Server-side favicon waterfall: Google → DuckDuckGo → Icon Horse.
 * Tries each service in order and streams back the first successful image.
 * The browser never makes the individual service requests directly, so
 * there are no 404s logged in the DevTools console.
 *
 * Works for: Chrome extension, Firefox extension, and website mode.
 * CORS: allows GET from chrome-extension://, moz-extension://, and production origins.
 */

import { assertOrigin, corsHeaders, FAVICON_SERVICES, PRIVATE_HOST_RE } from './_config.js';

/** Rough hostname validation — rejects obvious junk before hitting any upstream */
const VALID_DOMAIN_RE = /^[a-z0-9][a-z0-9\-_.]{0,252}[a-z0-9]$/i;
/** Allowed icon sizes — cap to prevent callers requesting huge images */
const ALLOWED_SIZES = new Set(['16', '32', '48', '64', '96', '128']);

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertOrigin(request);
  if (rejected) return rejected;
  const cors = corsHeaders(request);

  if (request.method !== 'GET') {
    return new Response(null, { status: 405, headers: cors });
  }

  const { searchParams } = new URL(request.url);
  const domain = searchParams.get('domain');
  const sz = searchParams.get('sz') || '64';
  if (!domain || typeof domain !== 'string') {
    return new Response(null, { status: 400, headers: cors });
  }
  if (!VALID_DOMAIN_RE.test(domain)) {
    return new Response(null, { status: 400, headers: cors });
  }
  if (PRIVATE_HOST_RE.test(domain)) {
    return new Response(null, { status: 204, headers: cors });
  }
  const size = ALLOWED_SIZES.has(sz) ? sz : '64';

  for (const makeUrl of FAVICON_SERVICES) {
    try {
      const upstream = await fetch(makeUrl(domain, size), {
        signal: AbortSignal.timeout(4000),
      });
      if (upstream.ok) {
        return new Response(await upstream.arrayBuffer(), {
          status: 200,
          headers: {
            ...cors,
            'Content-Type': upstream.headers.get('content-type') || 'image/png',
            // Edge CDN caches for 7 days; stale served for another day while revalidating
            'Cache-Control': 'public, s-maxage=604800, stale-while-revalidate=86400',
          },
        });
      }
    } catch {
      // try next service
    }
  }

  // All services failed — client falls through to letter-initial fallback
  return new Response(null, { status: 204, headers: cors });
}
