/**
 * RSS widget utilities — URL routing, preset feeds, localStorage cache, fetch helper,
 * and relative-time formatter.
 *
 * Three-environment URL routing (mirrors the stock widget pattern):
 *   dev       → Vite dev-server middleware at /api/rss/feed
 *   extension → Always Vercel proxy (RSS feeds are CORS-blocked from extension context)
 *   web       → Always Vercel proxy
 */

import { RSS_FEED_PROXY_URL } from '../../constants/urls.js';

// ── Environment detection ─────────────────────────────────────────────────────

const hostname = typeof location !== 'undefined' ? location.hostname : '';
const isDev = hostname === 'localhost';

// For extension: RSS feeds are CORS-blocked even with host_permissions, so we
// always route through the Vercel proxy. Only dev uses the local Vite proxy.
export function rssUrl(feedUrl) {
  const encoded = encodeURIComponent(feedUrl);
  if (isDev) return `/api/rss/feed?url=${encoded}`;
  return `${RSS_FEED_PROXY_URL}?url=${encoded}`;
}

// ── Preset feeds ──────────────────────────────────────────────────────────────

export const PRESET_FEEDS = [
  // International
  { id: 'bbc', label: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'international' },
  { id: 'reuters', label: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', category: 'international' },
  { id: 'guardian', label: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'international' },
  { id: 'aljazeera', label: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'international' },
  { id: 'dw', label: 'DW', url: 'https://rss.dw.com/rdf/rss-en-world', category: 'international' },
  { id: 'npr', label: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', category: 'international' },
  { id: 'nyt', label: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'international' },
  // Tech
  { id: 'hn', label: 'Hacker News', url: 'https://news.ycombinator.com/rss', category: 'tech' },
  { id: 'verge', label: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
  { id: 'techcrunch', label: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { id: 'ars', label: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech' },
  { id: 'wired', label: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' },
  { id: 'mit', label: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'tech' },
  // Nepal
  { id: 'kantipur', label: 'Kantipur', url: 'https://ekantipur.com/rss', category: 'nepal' },
  { id: 'republica', label: 'Republica', url: 'https://myrepublica.nagariknetwork.com/rss', category: 'nepal' },
  { id: 'ktmpost', label: 'Kathmandu Post', url: 'https://kathmandupost.com/rss', category: 'nepal' },
];

// Categories for the Settings UI
export const PRESET_CATEGORIES = [
  { id: 'international', label: 'International' },
  { id: 'tech', label: 'Technology' },
  { id: 'nepal', label: 'Nepal' },
];

// Default active feed IDs (enabled when widget is first added)
export const DEFAULT_ACTIVE_IDS = ['hn', 'bbc', 'guardian'];

export const DEFAULT_FEED_ID = 'hn'; // legacy — still used by useRss hook

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
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  } catch { return ''; }
}
