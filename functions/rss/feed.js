/**
 * GET /rss/feed?url=<encodedFeedUrl>
 *
 * Cloudflare Pages Function — fetches an RSS/Atom feed server-side (CORS bypass),
 * parses with rss-parser and returns clean JSON.
 *
 * Supports RSS 2.0, Atom 1.0, and most feed variants (media:*, enclosures, etc.).
 * Returns: { items: [{ title, link, pubDate, isoDate, source, image? }], fetchedAt: ISO }
 * Cache-Control: s-maxage=1800, stale-while-revalidate=300 (30 min CDN cache)
 *
 * Requires the `nodejs_compat` compatibility flag (rss-parser → xml2js needs
 * Node's Buffer/stream APIs).
 */

import Parser from 'rss-parser';
import { assertStrictOrigin, json, corsHeaders, PRIVATE_HOST_RE } from '../_config.js';
import { rateLimit } from '../_ratelimit.js';
import { PRESET_FEEDS } from '../../src/widgets/rss/feeds.js';

// ── Source label mapping (derived from PRESET_FEEDS — single source of truth) ─

const SOURCE_NAMES = Object.fromEntries(
  PRESET_FEEDS.flatMap(f => {
    try {
      const hostname = new URL(f.url).hostname.replace(/^www\./, '');
      return [[hostname, f.label]];
    } catch { return []; }
  })
);

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

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    const rejected = assertStrictOrigin(request);
    if (rejected) return rejected;
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }

  const rejected = assertStrictOrigin(request);
  if (rejected) return rejected;
  const limited = await rateLimit(env, request);
  if (limited) return limited;

  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405, { request });
  }

  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');
  // SSRF guard: only http/https, and never private/link-local/loopback hosts
  // (mirrors the favicon endpoint's PRIVATE_HOST_RE check).
  let feedUrl = null;
  try { feedUrl = new URL(url); } catch { feedUrl = null; }
  const isPrivateHost = feedUrl && PRIVATE_HOST_RE.test(feedUrl.hostname);
  const isHttp = feedUrl && (feedUrl.protocol === 'http:' || feedUrl.protocol === 'https:');
  if (!url || !feedUrl || !isHttp || isPrivateHost) {
    return json({ items: [], error: 'url is required' }, 400, { request });
  }

  try {
    // rss-parser's parseURL uses Node's http/https modules, which are
    // unreliable under the Workers nodejs_compat shim. Fetch the feed XML with
    // the standard fetch() API, then let rss-parser's parseString do the heavy
    // lifting (all feed variants + customFields) via xml2js.
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UndistractedMe/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error('upstream fetch failed');
    const xml = await upstream.text();
    const feed = await parser.parseString(xml);
    const source = sourceName(url) || feed.title || '';

    const items = (feed.items || [])
      .filter(item => item.title)
      .slice(0, 50)
      .map(item => ({
        title: decodeEntities(item.title || ''),
        // Only use guid as a link if it's an actual URL (podcast GUIDs are often not URLs)
        link: item.link || ((item.guid && /^https?:\/\//.test(item.guid)) ? item.guid : ''),
        pubDate: item.pubDate || '',
        isoDate: item.isoDate || '',
        source: decodeEntities(item.creator || item.author || source),
      }));

    return json({ items, fetchedAt: new Date().toISOString() }, 200, {
      request,
      headers: { 'Cache-Control': 's-maxage=1800, stale-while-revalidate=300' },
    });
  } catch {
    return json({ items: [], error: 'fetch_failed' }, 502, { request });
  }
}
