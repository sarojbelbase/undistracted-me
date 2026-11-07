/**
 * RSS feed definitions — single source of truth.
 *
 * Imported by:
 *   src/widgets/rss/utils.js   (client-side)
 *   rss/feed.js                (Cloudflare Pages Function — derives SOURCE_NAMES from this)
 *
 * No imports allowed here. Keep this file pure data so it is safe to import
 * from any environment (browser, Node.js, Cloudflare Pages Functions).
 */

export const PRESET_FEEDS = [
  // ── International ──────────────────────────────────────────────────────────
  { id: 'bbc', label: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'international' },
  { id: 'guardian', label: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'international' },
  { id: 'aljazeera', label: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'international' },
  { id: 'dw', label: 'DW', url: 'https://rss.dw.com/rdf/rss-en-world', category: 'international' },
  { id: 'npr', label: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml', category: 'international' },
  { id: 'nyt', label: 'NY Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'international' },
  // ── Tech ──────────────────────────────────────────────────────────────────
  { id: 'hn', label: 'Hacker News', url: 'https://news.ycombinator.com/rss', category: 'tech' },
  { id: 'verge', label: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'tech' },
  { id: 'techcrunch', label: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'tech' },
  { id: 'ars', label: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'tech' },
  { id: 'wired', label: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'tech' },
  { id: 'mit', label: 'MIT Tech Review', url: 'https://www.technologyreview.com/feed/', category: 'tech' },
  // ── Nepal ─────────────────────────────────────────────────────────────────
  { id: 'onlinekhabar', label: 'Online Khabar', url: 'https://www.onlinekhabar.com/feed', category: 'nepal' },
  { id: 'setopati', label: 'Setopati', url: 'https://setopati.com/feed', category: 'nepal' },
  { id: 'ratopati', label: 'Ratopati', url: 'https://ratopati.com/feed', category: 'nepal' },
  { id: 'nagarik', label: 'Nagarik News', url: 'https://nagariknetwork.com/rss', category: 'nepal' },
  { id: 'ktmpost', label: 'Kathmandu Post', url: 'https://kathmandupost.com/rss', category: 'nepal' },
];

// Categories for the Settings UI
export const PRESET_CATEGORIES = [
  { id: 'international', label: 'International' },
  { id: 'tech', label: 'Technology' },
  { id: 'nepal', label: 'Nepal' },
];

// Default active feed IDs + legacy default feed ID now live in
// constants/defaults.js (single source of truth). Re-exported for existing
// import paths by utils.js (not here) so this file stays pure data, safe to
// import from Node.js / Vercel edge without pulling in React.
