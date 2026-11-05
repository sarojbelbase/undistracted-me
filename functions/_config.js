/**
 * Shared constants + helpers for Cloudflare Pages Functions.
 * Prefixed with _ so Pages does not expose this as an HTTP endpoint
 * (files/dirs starting with `_` are not routed).
 */

/**
 * Regex that matches every valid request origin.
 * Extension ID locking is intentionally omitted — the API key is the auth layer.
 */
export const ALLOWED_ORIGINS =
  /^chrome-extension:\/\/|^moz-extension:\/\/|^https:\/\/(app\.|www\.)?undistracted\.me$|^http:\/\/localhost(:\d+)?$/;

/**
 * CORS headers for a request whose Origin is present + allowed.
 * Returns an empty object for same-origin requests (no Origin header),
 * matching the original Vercel behavior of omitting CORS headers then.
 */
export function corsHeaders(request, methods = 'GET, OPTIONS') {
  const origin = request.headers.get('origin') || '';
  if (!origin) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, X-Api-Key',
    'Vary': 'Origin',
  };
}

/**
 * Validate Origin. Returns null when the request may proceed, or a 403
 * Response to return immediately when the Origin is forbidden.
 * Call this for ALL endpoints including favicon (which can't send headers
 * from <img>).
 */
export function assertOrigin(request) {
  const origin = request.headers.get('origin') || '';
  // No Origin header = same-origin browser request (Chrome omits it on
  // same-origin fetch). Allow through without CORS headers.
  if (!origin) return null;
  if (!ALLOWED_ORIGINS.test(origin)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return null;
}

/**
 * Validate the X-Api-Key header against env.API_KEY.
 * Use on fetch()-based endpoints (photos, token, rain) — NOT on favicon which
 * loads via <img src> and cannot send custom headers.
 * In dev (API_KEY unset) the check is skipped so local development works.
 */
export function assertApiKey(request, env) {
  const expected = (env.API_KEY || '').trim();
  if (!expected) return null; // dev: no key configured
  const provided = request.headers.get('x-api-key');
  if (!provided || provided !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
  return null;
}

/**
 * Build a JSON Response. When `request` is supplied, CORS headers for the
 * allowed origin are attached; `headers` may override/add (e.g. Cache-Control).
 */
export function json(body, status = 200, { request, methods = 'GET, OPTIONS', headers = {} } = {}) {
  const h = { 'Content-Type': 'application/json; charset=utf-8' };
  if (request) Object.assign(h, corsHeaders(request, methods));
  Object.assign(h, headers);
  return new Response(JSON.stringify(body), { status, headers: h });
}

/**
 * Regex for private/local hostnames that should never be sent to external favicon services.
 * Covers all RFC 1918 private ranges, link-local (169.254), CGNAT (100.64-127), loopback,
 * and IPv6 loopback/ULA to prevent SSRF via the favicon proxy endpoint.
 */
export const PRIVATE_HOST_RE =
  /^localhost$|\.local$|\.internal$|^127\.|^192\.168\.|^10\.|^\[?::1\]?$|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\.|^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|^0\.0\.0\.0$/;

/**
 * Favicon waterfall services — ordered by preference.
 * The server tries each in sequence and returns the first successful image.
 */
export const FAVICON_SERVICES = [
  (domain, sz) => `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`,
  (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain) => `https://icon.horse/icon/${domain}`,
];
