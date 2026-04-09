/**
 * GET /api/stock/chart?symbol=NABIL&from=<unix>&to=<unix>
 *
 * Server-side proxy for merolagani.com TechnicalChartHandler.
 * Needed in website mode — merolagani.com blocks cross-origin browser requests.
 * Extensions call merolagani.com directly via host_permissions; only the website uses this.
 */

import { assertOrigin } from '../_config.js';

const ML_BASE = 'https://www.merolagani.com/handlers/TechnicalChartHandler.ashx';

/** Symbols: only uppercase NEPSE ticker format (1-10 chars) */
const SYMBOL_RE = /^[A-Z0-9]{1,10}$/;

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  const { symbol, from, to } = req.query;
  if (!symbol || !SYMBOL_RE.test(symbol)) return res.status(400).json({ error: 'invalid_symbol' });

  // Build upstream URL — mirror the same parameters the client would send
  const now = Math.floor(Date.now() / 1000);
  const rangeStart = (Number(from) || now - 90 * 24 * 60 * 60).toString();
  const rangeEnd = (Number(to) || now).toString();

  const upstreamUrl = `${ML_BASE}?type=get_advanced_chart&symbol=${encodeURIComponent(symbol)}&resolution=1D&rangeStartDate=${rangeStart}&rangeEndDate=${rangeEnd}&from=&isAdjust=1`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    const json = await upstream.json();
    res.setHeader('Content-Type', 'application/json');
    // Cache for 5 minutes — chart data updates during trading hours
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');
    return res.status(200).json(json);
  } catch {
    return res.status(502).json({ error: 'upstream_unavailable' });
  }
}
