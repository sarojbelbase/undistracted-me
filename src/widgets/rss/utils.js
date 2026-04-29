/**
 * RSS widget utilities — URL routing, preset feeds, localStorage cache, fetch helper,
 * and relative-time formatter.
 *
 * Three-environment URL routing (mirrors the stock widget pattern):
 *   dev       → Vite dev-server middleware at /api/rss/feed
 *   extension → Always Vercel proxy (RSS feeds are CORS-blocked from extension context)
 *   web       → Always Vercel proxy
 */

// ── Environment detection ─────────────────────────────────────────────────────

const hostname  = typeof location !== 'undefined' ? location.hostname : '';
const isDev     = hostname === 'localhost';

// For extension: RSS feeds are CORS-blocked even with host_permissions, so we
// always route through the Vercel proxy. Only dev uses the local Vite proxy.
export function rssUrl(feedUrl) {
  const encoded = encodeURIComponent(feedUrl);
  if (isDev) return `/api/rss/feed?url=${encoded}`;
  return `https://undistractedme.sarojbelbase.com.np/api/rss/feed?url=${encoded}`;
}

// ── Preset feeds ──────────────────────────────────────────────────────────────

export const PRESET_FEEDS = [
  { id: 'hn',        label: 'Hacker News',   url: 'https://news.ycombinator.com/rss' },
  { id: 'bbc',       label: 'BBC World',      url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { id: 'kantipur',  label: 'Kantipur',       url: 'https://ekantipur.com/rss' },
  { id: 'republica', label: 'Republica',      url: 'https://myrepublica.nagariknetwork.com/rss' },
  { id: 'ktmpost',   label: 'Kathmandu Post', url: 'https://kathmandupost.com/rss' },
];

export const DEFAULT_FEED_ID = 'hn';

// ── localStorage cache (TTL: 10 min) ─────────────────────────────────────────

const CACHE_TTL = 10 * 60 * 1000;

/**
 * Read a cached feed from localStorage. Returns null when absent or expired.
 * Shape: { items: [...], ts: number }
 */
export function readRssCache(feedId) {
  try {
    const raw = localStorage.getItem(`rss_cache_${feedId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) return null;
    return cached;
  } catch { return null; }
}

/** Write items + timestamp for a feed to localStorage. */
export function writeRssCache(feedId, items) {
  try {
    localStorage.setItem(`rss_cache_${feedId}`, JSON.stringify({ items, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

/**
 * Fetch a feed via the CORS proxy, returning the items array.
 * Throws on HTTP error or if the JSON body contains an `error` field.
 */
export async function fetchFeed(feedId, feedUrl) {
  const res = await fetch(rssUrl(feedUrl));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return json.items ?? [];
}

// ── Relative-time formatter ───────────────────────────────────────────────────

/**
 * Format an ISO date string as a compact relative label.
 * e.g. "just now", "3m ago", "2h ago", "1d ago"
 */
export function relativeTime(isoDate) {
  if (!isoDate) return '';
  try {
    const diff = Date.now() - new Date(isoDate).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 2)  return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}
