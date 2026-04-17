/**
 * GET /api/stocks/chart?symbol=NABIL&from=<unix>&to=<unix>
 *
 * Server-side proxy for merolagani.com TechnicalChartHandler.
 * Avoids CORS issues when the app is served from a web origin.
 */

import { assertOrigin } from '../_config.js';

const ML_BASE = 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { symbol, from, to } = req.query;
  if (!symbol) return res.status(400).json({ error: 'symbol is required' });

  const now = to ?? Math.floor(Date.now() / 1000);
  const start = from ?? (now - 90 * 24 * 60 * 60);

  const url = `${ML_BASE}?type=get_advanced_chart&symbol=${encodeURIComponent(symbol)}&resolution=1D&rangeStartDate=${start}&rangeEndDate=${now}&from=&isAdjust=1`;

  try {
    const upstream = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!upstream.ok) return res.status(upstream.status).json({ error: 'Upstream error' });
    const data = await upstream.json();
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch from merolagani.com' });
  }
}
