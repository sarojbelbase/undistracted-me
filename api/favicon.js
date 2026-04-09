/**
 * GET /api/favicon?domain=example.com&sz=64
 *
 * Server-side favicon waterfall: Google → DuckDuckGo → Icon Horse.
 * Tries each service in order and streams back the first successful image.
 * The browser never makes the individual service requests directly, so
 * there are no 404s logged in the DevTools console.
 *
 * Works for: Chrome extension, Firefox extension, and website mode.
 * CORS: allows GET from chrome-extension://, moz-extension://, and production origins.
 */

import { assertOrigin, FAVICON_SERVICES, PRIVATE_HOST_RE } from './_config.js';

/** Rough hostname validation — rejects obvious junk before hitting any upstream */
const VALID_DOMAIN_RE = /^[a-z0-9][a-z0-9\-_.]{0,252}[a-z0-9]$/i;
/** Allowed icon sizes — cap to prevent callers requesting huge images */
const ALLOWED_SIZES = new Set(['16', '32', '48', '64', '96', '128']);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  const { domain, sz = '64' } = req.query;
  if (!domain || typeof domain !== 'string') return res.status(400).end();
  if (!VALID_DOMAIN_RE.test(domain)) return res.status(400).end();
  if (PRIVATE_HOST_RE.test(domain)) return res.status(204).end();
  const size = ALLOWED_SIZES.has(sz) ? sz : '64';

  for (const makeUrl of FAVICON_SERVICES) {
    try {
      const upstream = await fetch(makeUrl(domain, size), {
        signal: AbortSignal.timeout(4000),
      });
      if (upstream.ok) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
        // Edge CDN caches for 7 days; stale served for another day while revalidating
        res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
        return res.status(200).send(buf);
      }
    } catch {
      // try next service
    }
  }

  // All services failed — client falls through to letter-initial fallback
  return res.status(204).end();
}
