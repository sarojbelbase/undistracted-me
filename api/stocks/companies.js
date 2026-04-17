/**
 * POST /api/stocks/companies
 *
 * Server-side proxy for nepalipaisa.com GetCompanies endpoint.
 * Avoids CORS issues when the app is served from a web origin.
 */

import { assertOrigin } from '../_config.js';

const NP_URL = 'https://nepalipaisa.com/api/GetCompanies';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res, 'POST, OPTIONS'); return res.status(204).end(); }
  if (!assertOrigin(req, res, 'POST, OPTIONS')) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const upstream = await fetch(NP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' },
      body: '[]',
    });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream error' });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=300');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch from nepalipaisa.com' });
  }
}
