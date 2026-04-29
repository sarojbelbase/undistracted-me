/**
 * Currency widget — utilities
 *
 * URL routing:  dev (localhost) → Vite proxy /nrb-api (add to vite.config.ts manually:
 *                 '/nrb-api': { target: 'https://undistractedme.sarojbelbase.com.np/api/currency',
 *                               changeOrigin: true, rewrite: p => p.replace(/^\/nrb-api/, '') })
 *               all other envs → Vercel API
 *
 * Cache:        localStorage, 30-min TTL (matches server CDN TTL)
 * Formatters:   fmtRate, fmtGold  — locale-aware, en-NP lakh grouping
 */

const hostname = typeof location !== 'undefined' ? location.hostname : '';
const isDev = hostname === 'localhost';

// ── URL routing ───────────────────────────────────────────────────────────────
// NRB requires server-side proxying for CORS (no direct browser fetch allowed).
// The extension also routes through Vercel — no host_permissions for nrb.org.np.
export function ratesUrl() {
  if (isDev) return '/nrb-api/rates';
  return 'https://undistractedme.sarojbelbase.com.np/api/currency/rates';
}

// ── Currency lists ────────────────────────────────────────────────────────────
// ALL_CURRENCIES: the full picker list shown in Settings
// DEFAULT_CURRENCIES: pre-selected on first install
export const ALL_CURRENCIES = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CNY'];
export const DEFAULT_CURRENCIES = ['USD', 'EUR', 'INR'];

// Human-readable labels shown next to the ISO code in Settings
export const CURRENCY_LABELS = {
  USD: 'US Dollar',
  EUR: 'Euro',
  GBP: 'Pound Sterling',
  INR: 'Indian Rupee',
  JPY: 'Japanese Yen',
  AUD: 'Australian Dollar',
  CNY: 'Chinese Yuan',
};

// ── Cache (localStorage, 30 min TTL) ─────────────────────────────────────────
const CACHE_KEY = 'currency_rates_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — mirrors Vercel s-maxage

/**
 * Read the cached rates payload.
 * Returns { data, fresh } or null when no valid cache entry exists.
 * `fresh` is true when the entry is less than 30 min old (network fetch can be skipped).
 */
export function readCurrencyCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry?.data) return null;
    return {
      data: entry.data,
      fresh: Date.now() - entry.ts < CACHE_TTL,
    };
  } catch {
    return null;
  }
}

/**
 * Persist a rates payload to localStorage so the next tab open can display
 * data instantly without waiting for a network round-trip.
 */
export function writeCurrencyCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Storage unavailable (private browsing quota, etc.) — fail silently
  }
}

// ── Network fetch ─────────────────────────────────────────────────────────────

/**
 * Fetch rates from the Vercel proxy (or Vite proxy in dev).
 * Throws on HTTP error or if the server returned { error: '...' }.
 *
 * Resolved shape: { rates, gold, silver, date, fetchedAt }
 */
export async function fetchRates() {
  const res = await fetch(ratesUrl());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json;
}

// ── Formatters ────────────────────────────────────────────────────────────────

/**
 * Format a NPR exchange rate with 2 decimal places.
 * Uses en-NP locale for lakh/crore number grouping.
 * e.g. 134.521 → "134.52"
 */
export function fmtRate(n) {
  if (n == null || !isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('en-NP', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format a gold/silver NPR per-tola price (rounded integer, lakh grouping).
 * e.g. 150200 → "1,50,200"
 */
export function fmtGold(n) {
  if (n == null || !isFinite(Number(n))) return '—';
  return Math.round(Number(n)).toLocaleString('en-NP');
}
