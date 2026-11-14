/**
 * RSS widget utilities — URL routing, preset feeds, localStorage cache, fetch helper,
 * and relative-time formatter.
 *
 * Three-environment URL routing (mirrors the stock widget pattern):
 *   dev       → Vite dev-server middleware at /rss/feed
 *   extension → Always backend proxy (RSS feeds are CORS-blocked from extension context)
 *   web       → Always backend proxy
 */

import { humanizeTime } from '../../utilities/humanizeTime';

import { RSS_FEED_PROXY_URL } from '../../constants/urls.js';
export { PRESET_FEEDS, PRESET_CATEGORIES } from './feeds.js';
// Default feed IDs live in constants/defaults.js (single source of truth).
export {
  DEFAULT_RSS_ACTIVE_IDS as DEFAULT_ACTIVE_IDS,
} from '../../constants/defaults.js';

// ── Environment detection ─────────────────────────────────────────────────────

const hostname = typeof location !== 'undefined' ? location.hostname : '';
const isDev = hostname === 'localhost';

// For extension: RSS feeds are CORS-blocked even with host_permissions, so we
// always route through the backend proxy. Only dev uses the local Vite proxy.
export function rssUrl(feedUrl) {
  const encoded = encodeURIComponent(feedUrl);
  if (isDev) return `/rss/feed?url=${encoded}`;
  return `${RSS_FEED_PROXY_URL}?url=${encoded}`;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

/**
 * Fetch a feed via the CORS proxy.
 * Returns `{ items, fetchedAt }` — `fetchedAt` is the proxy's server-side fetch
 * timestamp (the "current date of fetching"), persisted alongside the items.
 * Throws on HTTP error or if the JSON body contains an `error` field.
 */
export async function fetchFeed(feedId, feedUrl) {
  const res = await fetch(rssUrl(feedUrl));
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  return {
    items: json.items ?? [],
    fetchedAt: json.fetchedAt || new Date().toISOString(),
  };
}

// ── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Safe timestamp (ms) for an item's ISO date. Returns 0 for missing or invalid
 * dates so sorting never produces `NaN` (which makes Array.sort return
 * implementation-dependent, non-chronological order — e.g. an old item surfacing
 * ahead of a fresh one).
 */
export function rssItemTime(isoDate) {
  if (!isoDate) return 0;
  const t = new Date(isoDate).getTime();
  return Number.isFinite(t) ? t : 0;
}

// ── Relative-time formatter ───────────────────────────────────────────────────

/**
 * Format an ISO date string as a compact relative label.
 * e.g. "just now", "3m ago", "2h ago", "1d ago"
 */
export function relativeTime(isoDate) {
  if (!isoDate) return '';
  try {
    return humanizeTime(new Date(isoDate)).compact;
  } catch { return ''; }
}
