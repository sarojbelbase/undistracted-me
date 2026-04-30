/**
 * GET /api/rss/feed?url=<encodedFeedUrl>
 *
 * Vercel serverless function — fetches an RSS/ATOM feed server-side (CORS bypass),
 * parses with rss-parser (handles media:*, enclosures, ATOM, namespaces) and returns
 * clean JSON with best-available image per item.
 *
 * Returns: { items: [{ title, link, pubDate, isoDate, source, image }], fetchedAt: ISO }
 * Cache-Control: s-maxage=600, stale-while-revalidate=120 (10 min CDN cache)
 */

import Parser from 'rss-parser';
import { assertOrigin } from '../_config.js';

// ── Source label mapping ──────────────────────────────────────────────────────

const SOURCE_NAMES = {
  'news.ycombinator.com': 'Hacker News',
  'feeds.bbci.co.uk': 'BBC News',
  'ekantipur.com': 'Kantipur',
  'myrepublica.nagariknetwork.com': 'Republica',
  'kathmandupost.com': 'Kathmandu Post',
};

function sourceName(feedUrl) {
  try {
    const hostname = new URL(feedUrl).hostname.replace(/^www\./, '');
    return SOURCE_NAMES[hostname] || hostname;
  } catch { return ''; }
}

// ── Best-image extractor from a parsed rss-parser item ───────────────────────

function extractImage(item) {
  // 1. media:thumbnail — most Nepali WP feeds (Ratopati, Setopati, etc.)
  const mt = item['media:thumbnail'];
  if (mt) {
    const url = typeof mt === 'string' ? mt : (mt.$ && mt.$.url) || mt.url;
    if (url) return url;
  }

  // 2. media:content — standard media RSS namespace
  const mc = item['media:content'];
  if (mc) {
    const url = typeof mc === 'string' ? mc : (mc.$ && mc.$.url) || mc.url;
    if (url) return url;
  }

  // 3. enclosure with image MIME type or image-looking URL
  if (item.enclosure?.url) {
    if (/image/i.test(item.enclosure.type || '') ||
      /\.(jpe?g|png|webp|gif|avif)(\?|$)/i.test(item.enclosure.url)) {
      return item.enclosure.url;
    }
  }

  // 4. Custom <image> tag — Onlinekhabar and some WP themes
  const customImage = item['image'];
  if (customImage && typeof customImage === 'string' && customImage.startsWith('http')) {
    return customImage;
  }

  // 5. First <img src> inside HTML content / description
  const html = item['content:encoded'] || item.content || '';
  if (html) {
    const m = html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (m && m[1].startsWith('http')) return m[1];
  }

  return null;
}

// ── Shared rss-parser instance ────────────────────────────────────────────────

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UndistractedMe/1.0)' },
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['media:content', 'media:content'],
      ['image', 'image'],
    ],
  },
});

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') { assertOrigin(req, res); return res.status(204).end(); }
  if (!assertOrigin(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.query;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ items: [], error: 'url is required' });
  }

  try {
    const feed = await parser.parseURL(url);
    const source = sourceName(url);

    const items = (feed.items || []).map((item) => {
      const image = extractImage(item);
      const pubDate = item.pubDate || item.isoDate || '';
      let isoDate = item.isoDate || '';
      if (!isoDate && pubDate) {
        try { isoDate = new Date(pubDate).toISOString(); } catch { /* ignore */ }
      }
      return {
        title: (item.title || '').trim(),
        link: item.link || item.guid || '',
        pubDate,
        isoDate,
        source: item.creator || source,
        image,
      };
    }).filter((item) => item.title);

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
    return res.status(200).json({ items, fetchedAt: new Date().toISOString() });
  } catch {
    return res.status(502).json({ items: [], error: 'fetch_failed' });
  }
}
