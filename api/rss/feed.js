/**
 * GET /api/rss/feed?url=<encodedFeedUrl>
 *
 * Vercel serverless function — fetches an RSS/Atom feed server-side (CORS bypass),
 * parses with rss-parser and returns clean JSON.
 *
 * Supports RSS 2.0, Atom 1.0, and most feed variants (media:*, enclosures, etc.).
 * Returns: { items: [{ title, link, pubDate, isoDate, source, image? }], fetchedAt: ISO }
 * Cache-Control: s-maxage=1800, stale-while-revalidate=300 (30 min CDN cache)
 */

import Parser from 'rss-parser';
import { assertOrigin } from '../_config.js';

// ── Source label mapping ──────────────────────────────────────────────────────

const SOURCE_NAMES = {
  'news.ycombinator.com': 'Hacker News',
  'hnrss.org': 'Hacker News',
  'feeds.bbci.co.uk': 'BBC',
  'ekantipur.com': 'Kantipur',
  'myrepublica.nagariknetwork.com': 'Republica',
  'kathmandupost.com': 'Kathmandu Post',
  'rss.nytimes.com': 'NYT',
  'feeds.theguardian.com': 'The Guardian',
  'aljazeera.com': 'Al Jazeera',
  'npr.org': 'NPR',
  'feeds.arstechnica.com': 'Ars Technica',
  'techcrunch.com': 'TechCrunch',
  'wired.com': 'Wired',
  'theverge.com': 'The Verge',
  'rss.dw.com': 'DW',
  'feeds.reuters.com': 'Reuters',
};

function sourceName(feedUrl) {
  try {
    const hostname = new URL(feedUrl).hostname.replace(/^www\./, '');
    return SOURCE_NAMES[hostname] || hostname;
  } catch { return ''; }
}

// ── HTML entity decoder ───────────────────────────────────────────────────────
// rss-parser doesn't always decode numeric HTML character references (&#NNNN;)
// that appear literally inside feed titles (common in Nepali/South-Asian CMS).
function decodeEntities(str) {
  if (!str) return str;
  return str
    .replaceAll(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replaceAll(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"').replaceAll('&apos;', "'").replaceAll('&nbsp;', '\u00a0');
}

// ── Image extraction (media:*, enclosure, inline <img>) ──────────────────────

function getMediaUrl(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj.startsWith('http') ? obj : null;
  return obj.$?.url || obj.url || null;
}

function getEnclosureImage(enc) {
  if (!enc?.url) return null;
  return (/image/i.test(enc.type || '') || /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(enc.url))
    ? enc.url : null;
}

function getHtmlImage(html) {
  if (!html) return null;
  const m = /<img[^>]+src=["']([^"']+)["']/i.exec(html);
  return m?.[1]?.startsWith('http') ? m[1] : null;
}

function extractImage(item) {
  return (
    getMediaUrl(item.mediaThumbnail) ||
    getMediaUrl(item.mediaContent) ||
    getEnclosureImage(item.enclosure) ||
    getHtmlImage(item['content:encoded'] || item.content || '')
  );
}

// ── Parser instance ───────────────────────────────────────────────────────────

const parser = new Parser({
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UndistractedMe/1.0)' },
  timeout: 10000,
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
      ['dc:creator', 'creator'],
    ],
  },
});

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.query;
  if (!url?.startsWith('http')) {
    return res.status(400).json({ items: [], error: 'url is required' });
  }

  try {
    const feed = await parser.parseURL(url);
    const source = sourceName(url) || feed.title || '';

    const items = (feed.items || [])
      .filter(item => item.title)
      .slice(0, 50)
      .map(item => ({
        title: decodeEntities(item.title || ''),
        link: item.link || item.guid || '',
        pubDate: item.pubDate || '',
        isoDate: item.isoDate || '',
        source: decodeEntities(item.creator || item.author || source),
      }));

    res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate=300');
    return res.status(200).json({ items, fetchedAt: new Date().toISOString() });
  } catch {
    return res.status(502).json({ items: [], error: 'fetch_failed' });
  }
}
