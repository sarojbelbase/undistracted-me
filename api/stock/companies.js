/**
 * GET /api/stock/companies
 *
 * Server-side proxy for nepalipaisa.com/api/GetCompanies.
 * Needed in website mode — the browser origin is blocked by nepalipaisa.com's CORS policy.
 * Extensions call nepalipaisa.com directly via host_permissions; only the website uses this.
 */

import { assertOrigin } from '../_config.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const upstream = await fetch('https://nepalipaisa.com/api/GetCompanies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '[]',
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    const json = await upstream.json();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=600');
    return res.status(200).json(json);
  } catch {
    return res.status(502).json({ error: 'upstream_unavailable' });
  }
}
