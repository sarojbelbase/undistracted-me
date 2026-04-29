/**
 * GET /api/currency/rates
 *
 * Fetches Nepal Rastra Bank (NRB) forex rates + live metals spot prices in parallel.
 * Aggregates both into a single response so the client never has to call two origins.
 *
 * Response shape:
 * {
 *   rates: { USD: 134.00, EUR: 145.45, GBP: 170.12, INR: 1.60, JPY: 0.90, ... },
 *   gold:   { usd: 2345.67, nprPerTola: 150200 } | null,
 *   silver: { usd: 29.45,   nprPerTola: 1850   } | null,
 *   date:   '2024-01-30',
 *   fetchedAt: '<ISO timestamp>',
 * }
 *
 * All rates are normalized to 1-unit equivalents (e.g. JPY rate is per 1 JPY, not per 100).
 * Metals are null when the metals API is unavailable — rates are still returned.
 * Returns { error: 'rates_unavailable' } if NRB itself fails.
 *
 * Cache: 30 min CDN cache with a 5-min stale-while-revalidate window.
 */

import { assertOrigin } from '../_config.js';

const NRB_URL = 'https://www.nrb.org.np/api/forex/v1/rates?per_page=100&page=1';
const METALS_URL = 'https://api.metals.live/v1/spot';

// Currencies we care about — superset of what the widget can show
const SUPPORTED = new Set(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SGD', 'AED']);

// Unit conversion constants
const TROY_OZ_GRAMS = 31.1035; // grams per troy ounce
const TOLA_GRAMS = 11.664;     // grams per tola (standard South Asian unit)

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Parallel fetch ──────────────────────────────────────────────────────────
  const [nrbResult, metalsResult] = await Promise.allSettled([
    fetch(NRB_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }).then(r => {
      if (!r.ok) throw new Error(`NRB HTTP ${r.status}`);
      return r.json();
    }),
    fetch(METALS_URL, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }).then(r => {
      if (!r.ok) throw new Error(`Metals HTTP ${r.status}`);
      return r.json();
    }),
  ]);

  // ── NRB is required ─────────────────────────────────────────────────────────
  if (nrbResult.status === 'rejected') {
    console.error('[currency/rates] NRB fetch failed:', nrbResult.reason);
    return res.status(502).json({ error: 'rates_unavailable' });
  }

  const nrbJson = nrbResult.value;
  const payloads = nrbJson?.data?.payload ?? [];

  // NRB sometimes returns an empty payload for today — fall back to the most recent
  const payload = payloads.find(p => Array.isArray(p.rates) && p.rates.length > 0) ?? payloads[0];

  if (!payload?.rates?.length) {
    console.error('[currency/rates] NRB returned no rate data');
    return res.status(502).json({ error: 'rates_unavailable' });
  }

  const { date, rates: rawRates } = payload;

  // ── Build normalised rates map ──────────────────────────────────────────────
  // Midpoint = (buy + sell) / 2, then normalise to per-1-unit so callers never
  // need to know whether NRB quotes JPY per 100, INR per 100, etc.
  const rates = {};
  let usdNPR = null;

  for (const entry of rawRates) {
    const iso = entry?.currency?.iso3;
    if (!iso || !SUPPORTED.has(iso)) continue;

    const buy = parseFloat(entry.buy);
    const sell = parseFloat(entry.sell);
    const unit = Number(entry.currency?.unit ?? 1);

    if (!isFinite(buy) || !isFinite(sell) || unit <= 0) continue;

    const midPerUnit = ((buy + sell) / 2) / unit;
    rates[iso] = midPerUnit;

    if (iso === 'USD') usdNPR = midPerUnit;
  }

  if (Object.keys(rates).length === 0) {
    return res.status(502).json({ error: 'rates_unavailable' });
  }

  // ── Metals ──────────────────────────────────────────────────────────────────
  // Formula: nprPerTola = (spotUSD / TROY_OZ_GRAMS) * TOLA_GRAMS * usdNPR
  let gold = null;
  let silver = null;

  if (metalsResult.status === 'fulfilled' && usdNPR != null) {
    const metalArr = metalsResult.value;
    if (Array.isArray(metalArr)) {
      let goldUSD = null;
      let silverUSD = null;

      for (const item of metalArr) {
        if (item.gold != null && goldUSD == null) goldUSD = Number(item.gold);
        if (item.silver != null && silverUSD == null) silverUSD = Number(item.silver);
      }

      if (goldUSD != null && isFinite(goldUSD)) {
        const nprPerTola = (goldUSD / TROY_OZ_GRAMS) * TOLA_GRAMS * usdNPR;
        gold = { usd: goldUSD, nprPerTola: Math.round(nprPerTola) };
      }

      if (silverUSD != null && isFinite(silverUSD)) {
        const nprPerTola = (silverUSD / TROY_OZ_GRAMS) * TOLA_GRAMS * usdNPR;
        silver = { usd: silverUSD, nprPerTola: Math.round(nprPerTola) };
      }
    }
  } else if (metalsResult.status === 'rejected') {
    // Log but do not fail — rates are still useful without metals
    console.warn('[currency/rates] Metals fetch failed (non-fatal):', metalsResult.reason?.message);
  }

  // ── Respond ─────────────────────────────────────────────────────────────────
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
  return res.status(200).json({
    rates,
    gold,
    silver,
    date,
    fetchedAt: new Date().toISOString(),
  });
}
