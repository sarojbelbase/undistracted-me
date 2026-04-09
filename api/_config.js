/**
 * Shared constants for Vercel API route handlers.
 * Prefixed with _ so Vercel does not expose this as an HTTP endpoint.
 */

/**
 * Regex that matches every valid request origin.
 * Extension ID locking is intentionally omitted — the API key is the auth layer.
 */
export const ALLOWED_ORIGINS =
  /^chrome-extension:\/\/|^moz-extension:\/\/|^https:\/\/undistractedme\.sarojbelbase\.com\.np|^http:\/\/localhost(:\d+)?$/;

/**
 * Apply CORS headers and validate Origin.
 * Returns true if the request should proceed, false if already rejected.
 * Call this for ALL endpoints including favicon (which can't send headers from <img>).
 */
export const assertOrigin = (req, res, methods = 'GET, OPTIONS') => {
  const origin = req.headers.origin || '';
  // No Origin header = same-origin browser request (Chrome omits it on same-origin fetch).
  // These can only arrive from the same page, so allow them through without CORS headers.
  if (!origin) return true;
  if (!ALLOWED_ORIGINS.test(origin)) {
    res.status(403).json({ error: 'Forbidden' });
    return false;
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Api-Key');
  res.setHeader('Vary', 'Origin');
  return true;
};

/**
 * Validate the X-Api-Key header against the API_KEY env var.
 * Use on fetch()-based endpoints (photos, token) — NOT on favicon which loads
 * via <img src> and cannot send custom headers.
 * In dev (API_KEY unset) the check is skipped so local development works without secrets.
 *
 * Server uses process.env.API_KEY (no VITE_ prefix — VITE_ vars are build-time only).
 * The same secret value is also stored as VITE_API_KEY for the client bundle.
 */
export const assertApiKey = (req, res) => {
  const expected = process.env.API_KEY?.trim();
  if (!expected) return true; // dev: no key configured
  const provided = req.headers['x-api-key'];
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
};

/**
 * Regex for private/local hostnames that should never be sent to external favicon services.
 */
export const PRIVATE_HOST_RE = /^localhost$|\.local$|\.internal$|^127\.|^192\.168\.|^10\.|^\[?::1\]?$/;

/**
 * Favicon waterfall services — ordered by preference.
 * The server tries each in sequence and returns the first successful image.
 */
export const FAVICON_SERVICES = [
  (domain, sz) => `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`,
  (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain) => `https://icon.horse/icon/${domain}`,
];
