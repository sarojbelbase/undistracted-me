/**
 * Shared GET forward-proxy factory for third-party APIs.
 *
 * Wraps an upstream base URL so the extension / web app only ever talk to
 * api.undistracted.me: the real provider (Open-Meteo, Nominatim, icanhazdadjoke…)
 * lives server-side and is never referenced by client code. The incoming query
 * string is forwarded verbatim, so each endpoint is a one-liner and the client
 * keeps its existing URLSearchParams unchanged.
 *
 * Applies the same origin allow-list + rate-limiting as the rest of the API,
 * and passes through the upstream status/body/Content-Type with a Cache-Control
 * hint so Cloudflare can cache static-ish responses at the edge.
 */

import { assertStrictOrigin, corsHeaders } from './_config.js';
import { rateLimit } from './_ratelimit.js';

export function makeProxy(upstreamBase, {
  headers = {},
  cacheControl = 's-maxage=300, stale-while-revalidate=60',
} = {}) {
  return async function onRequest(context) {
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
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request) },
      });
    }

    const qs = new URL(request.url).search;
    try {
      const upstream = await fetch(`${upstreamBase}${qs}`, {
        headers: {
          'User-Agent': 'UndistractedMe/4.0 (https://undistracted.me)',
          ...headers,
        },
      });
      const body = await upstream.arrayBuffer();
      return new Response(body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('Content-Type') || 'application/json; charset=utf-8',
          'Cache-Control': cacheControl,
          ...corsHeaders(request),
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Upstream error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(request) },
      });
    }
  };
}
