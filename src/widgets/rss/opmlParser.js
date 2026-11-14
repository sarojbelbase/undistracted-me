/**
 * opmlParser.js — Parse OPML (Outline Processor Markup Language) files
 * to extract RSS/Atom feed subscriptions.
 *
 * OPML is the standard exchange format for feed readers. This parser
 * uses the native DOMParser API — zero dependencies.
 *
 * OPML structure:
 *   <opml version="2.0">
 *     <head><title>...</title></head>
 *     <body>
 *       <outline text="Folder Name">                        ← folder (no xmlUrl)
 *         <outline type="rss" xmlUrl="https://..." .../>   ← feed
 *       </outline>
 *       <outline type="rss" xmlUrl="https://..." .../>     ← top-level feed
 *     </body>
 *   </opml>
 *
 * Usage:
 *   import { parseOPML } from './opmlParser';
 *   const result = parseOPML(xmlString);
 *   // result: { feeds: [...], error: null } | { feeds: [], error: '...' }
 */

/**
 * @typedef {object} OPMLFeed
 * @property {string} label  — feed title (falls back to URL if missing)
 * @property {string} url    — the xmlUrl attribute value
 * @property {boolean} active — always true for parsed feeds
 * @property {boolean} valid — false if URL is malformed (flagged with ⚠️)
 */

/**
 * Parse an OPML XML string and return extracted feed subscriptions.
 *
 * @param {string} xmlString — raw OPML XML content
 * @returns {{ feeds: OPMLFeed[], error: string | null }}
 */
export function parseOPML(xmlString) {
  if (xmlString == null || typeof xmlString !== 'string') {
    return { feeds: [], error: 'No content to parse.' };
  }

  const trimmed = xmlString.trim();
  if (!trimmed) {
    return { feeds: [], error: 'The pasted content is empty.' };
  }

  // ── Parse XML ──────────────────────────────────────────────────────────
  const parser = new DOMParser();
  const doc = parser.parseFromString(trimmed, 'text/xml');

  // Check for XML parse errors (the browser inserts a <parsererror> element)
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    const msg = parseError.textContent?.replace(/^.*error:\s*/s, '') || 'Invalid XML';
    return { feeds: [], error: `Invalid OPML — ${msg.trim().slice(0, 120)}` };
  }

  // ── Validate basic OPML structure ──────────────────────────────────────
  const opmlEl = doc.querySelector('opml');
  if (!opmlEl) {
    // Some OPML files omit the <opml> wrapper — try finding any outline
    const anyOutline = doc.querySelector('outline[xmlUrl]');
    if (!anyOutline) {
      return { feeds: [], error: 'Not a valid OPML file — no <opml> root or feed outlines found.' };
    }
  }

  // ── Extract feeds (flatten nested folders) ─────────────────────────────

  /** Validate that a URL uses http: or https: protocol. */
  const isValidHttpUrl = (url) => {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch { return false; }
  };

  /** Get the best available title from an outline element. */
  const getOutlineTitle = (el) =>
    el.getAttribute('title')?.trim()
    || el.getAttribute('text')?.trim()
    || '';

  /** Build a feed object from an outline element and add it to the feeds array. */
  const addFeed = (outline, url, seen, arr) => {
    if (seen.has(url)) return; // deduplicate
    seen.add(url);
    const title = getOutlineTitle(outline);
    arr.push({
      label: title || url,
      url,
      active: true,
      valid: isValidHttpUrl(url),
    });
  };

  const seenUrls = new Set();
  const feeds = [];

  /**
   * Recursively walk <outline> elements.
   * An outline with xmlUrl is a feed; otherwise it's a folder.
   */
  const walk = (element) => {
    for (const outline of element.querySelectorAll(':scope > outline')) {
      const xmlUrl = outline.getAttribute('xmlUrl')?.trim();
      if (xmlUrl) {
        addFeed(outline, xmlUrl, seenUrls, feeds);
      } else {
        walk(outline); // folder — recurse
      }
    }
  };

  // Walk from <body> if it exists
  const body = doc.querySelector('opml > body') || doc.querySelector('body');
  if (body) walk(body);

  // Handle bare <outline> at document level (no <opml>/<body> wrapper)
  if (!opmlEl && !body) {
    const rootEl = doc.documentElement;
    if (rootEl?.tagName === 'outline') {
      const xmlUrl = rootEl.getAttribute('xmlUrl')?.trim();
      if (xmlUrl) addFeed(rootEl, xmlUrl, seenUrls, feeds);
    }
    walk(doc);
  }

  if (feeds.length === 0) {
    return { feeds: [], error: 'No RSS feeds found in the OPML file. Make sure it contains <outline> elements with xmlUrl attributes.' };
  }

  return { feeds, error: null };
}

/**
 * Quick check to determine if a string looks like OPML (vs JSON or other).
 * Used to auto-detect import type from pasted content.
 *
 * @param {string} text
 * @returns {boolean}
 */
export const looksLikeOPML = (text) => {
  const trimmed = text.trim();
  return trimmed.startsWith('<?xml')
    || trimmed.startsWith('<opml')
    || (trimmed.includes('<opml') && trimmed.includes('<outline'));
};

// ─── OPML Export ─────────────────────────────────────────────────────────────

/**
 * Generate an OPML XML string from an array of feed objects.
 *
 * @param {Array<{label: string, url: string}>} feeds
 * @param {object} [options]
 * @param {string} [options.title='Undistracted Me Feeds'] — OPML <head> title
 * @returns {string} formatted OPML XML
 */
export function generateOPML(feeds, { title = 'Undistracted Me Feeds' } = {}) {
  const escapedTitle = escapeXml(title);
  const now = new Date().toISOString();

  const outlines = feeds
    .filter((f) => f.url)
    .map((f) => {
      const escapedLabel = escapeXml(f.label || f.url);
      const escapedUrl = escapeXml(f.url);
      return `      <outline type="rss" xmlUrl="${escapedUrl}" title="${escapedLabel}" text="${escapedLabel}"/>`;
    })
    .join('\n');

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<opml version="2.0">',
    '  <head>',
    `    <title>${escapedTitle}</title>`,
    `    <dateCreated>${now}</dateCreated>`,
    '  </head>',
    '  <body>',
    outlines,
    '  </body>',
    '</opml>',
    '',
  ].join('\n');
}

/** Escape special XML characters in text content. */
function escapeXml(str) {
  return str
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/**
 * Generate a sample OPML with real-world Nepali news feeds and podcast examples,
 * organized in folders so users can see the expected format including nested outlines.
 *
 * @returns {string} sample OPML XML
 */
export function generateSampleOPML() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>My Feeds (Sample OPML)</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
    <outline text="News">
      <outline type="rss" xmlUrl="https://ekantipur.com/rss" title="Kantipur" text="Kantipur"/>
      <outline type="rss" xmlUrl="https://www.onlinekhabar.com/feed" title="Onlinekhabar" text="Onlinekhabar"/>
      <outline type="rss" xmlUrl="https://setopati.com/rss" title="Setopati" text="Setopati"/>
      <outline type="rss" xmlUrl="https://ratopati.com/feed" title="Ratopati" text="Ratopati"/>
      <outline type="rss" xmlUrl="https://kathmandupost.com/rss" title="The Kathmandu Post" text="The Kathmandu Post"/>
      <outline type="rss" xmlUrl="https://thehimalayantimes.com/rss" title="The Himalayan Times" text="The Himalayan Times"/>
      <outline type="rss" xmlUrl="https://myrepublica.nagariknetwork.com/rss" title="Republica" text="Republica"/>
      <outline type="rss" xmlUrl="https://feeds.bbci.co.uk/nepali/rss.xml" title="BBC News Nepali" text="BBC News Nepali"/>
    </outline>
    <outline text="Podcasts">
      <outline type="rss" xmlUrl="https://feeds.simplecast.com/example" title="My Favorite Podcast" text="My Favorite Podcast"/>
      <outline type="rss" xmlUrl="https://example.com/tech-podcast/feed.xml" title="Tech Weekly" text="Tech Weekly"/>
    </outline>
  </body>
</opml>
`;
}

/**
 * Download a string as a file via a temporary anchor element.
 *
 * @param {string} content — file content
 * @param {string} filename
 * @param {string} [mimeType='text/xml']
 */
export function downloadFile(content, filename, mimeType = 'text/xml') {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
