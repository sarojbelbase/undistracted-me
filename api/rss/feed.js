/**
 * GET /api/rss/feed?url=<encodedFeedUrl>
 *
 * Vercel serverless function — fetches an RSS/ATOM feed server-side (CORS bypass),
 * parses XML with regex (no npm deps), and returns clean JSON.
 *
 * Returns: { items: [{ title, link, pubDate, isoDate, source }], fetchedAt: ISO }
 * Cache-Control: s-maxage=600, stale-while-revalidate=120 (10 min CDN cache)
 */

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

// ── XML parsing helpers ───────────────────────────────────────────────────────

/** Strip CDATA wrappers and trim surrounding whitespace. */
function stripCdata(str) {
  return str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim();
}

/** Extract the text content of the first matching tag (strips CDATA). */
function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return m ? stripCdata(m[1]) : '';
}

/**
 * Extract the best available image URL from an RSS item block.
 * Tries (in priority order):
 *   1. <media:thumbnail url="..."> — BBC, Reuters, most major news RSS
 *   2. <media:content url="..." medium="image"> — generic media RSS
 *   3. <enclosure type="image/..." url="..."> — standard RSS enclosures
 *   4. First <img src="..."> inside <description> or <content:encoded>
 */
function extractImage(block) {
  // 1. media:thumbnail (attribute order varies — url can appear anywhere)
  const mt = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/i);
  if (mt) return mt[1];

  // 2. media:content with medium="image"
  const mc =
    block.match(/<media:content[^>]+medium=["']image["'][^>]*url=["']([^"']+)["']/i) ||
    block.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*medium=["']image["']/i);
  if (mc) return mc[1];

  // 3. enclosure with image MIME type
  const enc =
    block.match(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]+url=["']([^"']+)["']/i) ||
    block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\/[^"']+["']/i);
  if (enc) return enc[1];

  // 4. first <img> inside description / content:encoded
  const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
  if (desc) {
    const img = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (img && img[1].startsWith('http')) return img[1];
  }

  return null;
}

/**
 * Parse RSS 2.0 or ATOM XML into a uniform items array (max 10).
 * RSS 2.0: <item> → <title>, <link>, <pubDate>
 * ATOM:    <entry> → <title>, <link href> | <id>, <updated> | <published>
 * All items include an optional `image` field (first found image URL).
 */
function parseRssXml(xml, feedUrl) {
  const source = sourceName(feedUrl);
  const items = [];

  // ── RSS 2.0 ──────────────────────────────────────────────────────────────
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < 10) {
    const block = m[1];
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    const pubDate = extractTag(block, 'pubDate');
    const image = extractImage(block);
    let isoDate = '';
    try { if (pubDate) isoDate = new Date(pubDate).toISOString(); } catch { }
    if (title) items.push({ title, link, pubDate, isoDate, source, image });
  }

  // ── ATOM fallback (no <item> tags found) ─────────────────────────────────
  if (items.length === 0) {
    const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRe.exec(xml)) !== null && items.length < 10) {
      const block = m[1];
      const title = extractTag(block, 'title');
      // ATOM <link> is typically a self-closing tag with href attribute
      const linkHrefM = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkHrefM ? linkHrefM[1] : extractTag(block, 'id');
      const pubDate = extractTag(block, 'updated') || extractTag(block, 'published');
      const image = extractImage(block);
      let isoDate = '';
      try { if (pubDate) isoDate = new Date(pubDate).toISOString(); } catch { }
      if (title) items.push({ title, link, pubDate, isoDate, source, image });
    }
  }

  return items;
}

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
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UndistractedMe/1.0)' },
    });
    if (!r.ok) throw new Error(`upstream ${r.status}`);
    const xml = await r.text();
    const items = parseRssXml(xml, url);
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=120');
    return res.status(200).json({ items, fetchedAt: new Date().toISOString() });
  } catch {
    return res.status(502).json({ items: [], error: 'fetch_failed' });
  }
}
