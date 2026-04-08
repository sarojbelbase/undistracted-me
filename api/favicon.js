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

const ALLOWED_ORIGINS =
  /^chrome-extension:\/\/|^moz-extension:\/\/|^https:\/\/whatsthemiti\.sarojbelbase\.com\.np|^https:\/\/undistractedme\.sarojbelbase\.com/;

const SERVICES = [
  (domain, sz) => `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`,
  (domain) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain) => `https://icon.horse/icon/${domain}`,
];

const applyCors = (req, res) => {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
};

export default async function handler(req, res) {
  applyCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { domain, sz = '64' } = req.query;
  if (!domain || typeof domain !== 'string') return res.status(400).end();

  for (const makeUrl of SERVICES) {
    try {
      const upstream = await fetch(makeUrl(domain, sz));
      if (upstream.ok) {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png');
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        return res.status(200).send(buf);
      }
    } catch {
      // try next service
    }
  }

  // All services failed — client falls through to letter-initial fallback
  return res.status(204).end();
}
