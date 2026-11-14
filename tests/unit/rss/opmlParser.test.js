/**
 * Unit tests for opmlParser.js — pure DOMParser-based OPML parser.
 *
 * Covers:
 *  - Valid OPML with top-level feeds
 *  - Nested folder flattening
 *  - Duplicate URL deduplication
 *  - Missing title → falls back to URL
 *  - Invalid/malformed XML
 *  - Empty OPML / no feeds
 *  - URL validation (non-http protocols flagged)
 *  - looksLikeOPML detection helper
 *  - Missing <opml> wrapper (bare outlines)
 */

import { describe, it, expect } from 'vitest';
import { parseOPML, looksLikeOPML } from '../../../src/widgets/rss/opmlParser';

// ─── Sample OPML fixtures ────────────────────────────────────────────────────

const validOPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>My Feeds</title></head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed.xml" title="Example Blog" text="Example Blog"/>
    <outline type="rss" xmlUrl="https://news.site/rss" title="News Site"/>
  </body>
</opml>`;

const nestedOPML = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head><title>Folders</title></head>
  <body>
    <outline text="Tech Blogs">
      <outline type="rss" xmlUrl="https://tech1.com/feed" title="Tech One"/>
      <outline type="rss" xmlUrl="https://tech2.com/rss" title="Tech Two"/>
    </outline>
    <outline text="News">
      <outline type="rss" xmlUrl="https://news.com/feed" title="General News"/>
      <outline text="Sub-folder">
        <outline type="rss" xmlUrl="https://local.com/rss" title="Local News"/>
      </outline>
    </outline>
  </body>
</opml>`;

const duplicateOPML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Dupes</title></head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed" title="First"/>
    <outline type="rss" xmlUrl="https://example.com/feed" title="Duplicate"/>
    <outline type="rss" xmlUrl="https://other.com/rss" title="Other"/>
  </body>
</opml>`;

const missingTitleOPML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>No Titles</title></head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed.xml"/>
    <outline type="rss" xmlUrl="https://other.com/rss" title="Has Title"/>
  </body>
</opml>`;

const invalidUrlOPML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Bad URLs</title></head>
  <body>
    <outline type="rss" xmlUrl="https://good.com/feed" title="Good"/>
    <outline type="rss" xmlUrl="ftp://bad-protocol.com/feed" title="FTP"/>
    <outline type="rss" xmlUrl="not-a-valid-url" title="Malformed"/>
  </body>
</opml>`;

const emptyBodyOPML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Empty</title></head>
  <body>
    <outline text="Just a folder — no feeds here">
      <outline text="Nested folder — still no feeds"/>
    </outline>
  </body>
</opml>`;

const noOPMLWrapper = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>Not OPML</title>
    <link>https://example.com</link>
  </channel>
</rss>`;

const bareOutlinesXML = `<?xml version="1.0"?>
<outline type="rss" xmlUrl="https://bare.com/feed" title="Bare Feed"/>`;

const malformedXML = `<?xml version="1.0"?>
<opml version="2.0">
  <head><title>Broken</title></head>
  <body>
    <outline type="rss" xmlUrl="https://example.com/feed" title="Good"
    <unclosed>
  </body>
</opml>`;

// ─── Tests: parseOPML ────────────────────────────────────────────────────────

describe('parseOPML', () => {
  // ── Happy path ─────────────────────────────────────────────────────────

  it('parses a valid OPML with top-level feeds', () => {
    const result = parseOPML(validOPML);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(2);
    expect(result.feeds[0]).toMatchObject({
      label: 'Example Blog',
      url: 'https://example.com/feed.xml',
      active: true,
      valid: true,
    });
    expect(result.feeds[1]).toMatchObject({
      label: 'News Site',
      url: 'https://news.site/rss',
    });
  });

  it('flattens nested folders recursively', () => {
    const result = parseOPML(nestedOPML);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(4);
    const urls = result.feeds.map((f) => f.url);
    expect(urls).toContain('https://tech1.com/feed');
    expect(urls).toContain('https://tech2.com/rss');
    expect(urls).toContain('https://news.com/feed');
    expect(urls).toContain('https://local.com/rss');
  });

  it('deduplicates feeds by URL (first wins)', () => {
    const result = parseOPML(duplicateOPML);
    expect(result.error).toBeNull();
    // 3 outlines, but 2 unique URLs
    expect(result.feeds).toHaveLength(2);
    const urls = result.feeds.map((f) => f.url);
    expect(urls).toEqual(['https://example.com/feed', 'https://other.com/rss']);
    // First occurrence's title is kept
    expect(result.feeds[0].label).toBe('First');
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it('falls back to URL as label when title and text are missing', () => {
    const result = parseOPML(missingTitleOPML);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(2);
    // First feed has no title → label should be the URL
    expect(result.feeds[0].label).toBe('https://example.com/feed.xml');
    // Second has a title
    expect(result.feeds[1].label).toBe('Has Title');
  });

  it('flags invalid URLs (non-http protocol) as valid=false', () => {
    const result = parseOPML(invalidUrlOPML);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(3);

    const good = result.feeds.find((f) => f.url === 'https://good.com/feed');
    expect(good.valid).toBe(true);

    const ftp = result.feeds.find((f) => f.url.startsWith('ftp://'));
    expect(ftp.valid).toBe(false);

    const malformed = result.feeds.find((f) => f.url === 'not-a-valid-url');
    expect(malformed.valid).toBe(false);
  });

  it('returns an error when no feeds are found', () => {
    const result = parseOPML(emptyBodyOPML);
    expect(result.feeds).toHaveLength(0);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('No RSS feeds found');
  });

  it('returns an error for non-OPML XML without outlines', () => {
    const result = parseOPML(noOPMLWrapper);
    expect(result.feeds).toHaveLength(0);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Not a valid OPML file');
  });

  it('handles bare outlines without <opml> wrapper', () => {
    const result = parseOPML(bareOutlinesXML);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(1);
    expect(result.feeds[0].url).toBe('https://bare.com/feed');
  });

  // ── Input validation ────────────────────────────────────────────────────

  it('returns an error for null/undefined input', () => {
    const resultNull = parseOPML(null);
    expect(resultNull.feeds).toHaveLength(0);
    expect(resultNull.error).toBe('No content to parse.');

    const resultUndef = parseOPML(undefined);
    expect(resultUndef.feeds).toHaveLength(0);
    expect(resultUndef.error).toBe('No content to parse.');
  });

  it('returns an error for empty string input', () => {
    const result = parseOPML('');
    expect(result.feeds).toHaveLength(0);
    expect(result.error).toBe('The pasted content is empty.');
  });

  it('returns an error for whitespace-only input', () => {
    const result = parseOPML('   \n  \t  ');
    expect(result.feeds).toHaveLength(0);
    expect(result.error).toBe('The pasted content is empty.');
  });

  it('returns an error for malformed XML', () => {
    const result = parseOPML(malformedXML);
    expect(result.feeds).toHaveLength(0);
    expect(result.error).toBeTruthy();
    expect(result.error).toContain('Invalid OPML');
  });

  it('handles OPML with text attribute as title fallback', () => {
    // The `text` attribute is used when `title` is absent
    const opml = `<?xml version="1.0"?>
    <opml version="2.0">
      <head><title>Test</title></head>
      <body>
        <outline type="rss" xmlUrl="https://textonly.com/feed" text="From Text Attr"/>
      </body>
    </opml>`;
    const result = parseOPML(opml);
    expect(result.error).toBeNull();
    expect(result.feeds[0].label).toBe('From Text Attr');
  });

  it('skips folder outlines without xmlUrl (they are not feeds)', () => {
    const result = parseOPML(emptyBodyOPML);
    // The folder outlines exist but have no xmlUrl → no feeds extracted
    expect(result.feeds).toHaveLength(0);
  });

  // ── Real-world OPML examples ────────────────────────────────────────────

  it('parses a minimal valid OPML', () => {
    const opml = `<opml version="2.0"><body><outline type="rss" xmlUrl="https://minimal.com/feed" title="Minimal"/></body></opml>`;
    const result = parseOPML(opml);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(1);
    expect(result.feeds[0].label).toBe('Minimal');
  });

  it('parses OPML with deeply nested folders (3+ levels)', () => {
    const deep = `<?xml version="1.0"?>
    <opml version="2.0">
      <head><title>Deep</title></head>
      <body>
        <outline text="L1">
          <outline text="L2">
            <outline text="L3">
              <outline type="rss" xmlUrl="https://deep.com/feed" title="Deep Feed"/>
            </outline>
          </outline>
        </outline>
      </body>
    </opml>`;
    const result = parseOPML(deep);
    expect(result.error).toBeNull();
    expect(result.feeds).toHaveLength(1);
    expect(result.feeds[0].url).toBe('https://deep.com/feed');
  });
});

// ─── Tests: looksLikeOPML ─────────────────────────────────────────────────────

describe('looksLikeOPML', () => {
  it('returns true for XML declaration with opml content', () => {
    expect(looksLikeOPML(validOPML)).toBe(true);
  });

  it('returns true for content starting with <opml', () => {
    expect(looksLikeOPML('<opml version="2.0"><body>...</body></opml>')).toBe(true);
  });

  it('returns true for content containing both <opml and <outline', () => {
    expect(looksLikeOPML('some text <opml><outline xmlUrl="..."/></opml> more')).toBe(true);
  });

  it('returns false for JSON content', () => {
    expect(looksLikeOPML('[{"label":"Test","url":"https://example.com"}]')).toBe(false);
  });

  it('returns false for plain text', () => {
    expect(looksLikeOPML('Just some random text')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(looksLikeOPML('')).toBe(false);
  });
});
