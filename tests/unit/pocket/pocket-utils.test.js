/**
 * Unit tests for app/widgets/pocket/utils.js (pure, storage-free helpers).
 */

import { describe, it, expect } from 'vitest';
import {
  codeLikeness,
  isSingleHttpUrl,
  isSingleWord,
  classifyKind,
  cleanUrl,
  cleanText,
  normalizeText,
  dedupeKey,
  findDuplicate,
  hostFromUrl,
  hostHueColor,
  searchItems,
  groupBySite,
  timeBucket,
  mergeStates,
  sanitizeImport,
} from '../../../app/widgets/pocket/utils';
import { MAX_TEXT_LENGTH } from '../../../app/widgets/pocket/constants';

const item = (over = {}) => ({
  id: crypto.randomUUID(),
  kind: 'sentence',
  text: 'hello',
  title: '',
  host: '',
  sourceUrl: '',
  favicon: '',
  folderIds: [],
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  ...over,
});

describe('classifyKind', () => {
  it('classifies a single http(s) URL as link', () => {
    expect(classifyKind('https://react.dev/learn')).toBe('link');
    expect(classifyKind('http://example.com')).toBe('link');
  });

  it('classifies link context (fromLink/fromPage) as link', () => {
    expect(classifyKind('https://x.dev', { fromLink: true })).toBe('link');
    expect(classifyKind('some page', { fromPage: true })).toBe('link');
  });

  it('classifies code by markers with a newline', () => {
    const code = 'const sum = (a, b) => a + b;\nreturn sum;';
    expect(classifyKind(code)).toBe('code');
  });

  it('classifies code by markers with 20+ chars and no newline', () => {
    expect(classifyKind('const total = items.reduce((a, b) => a + b, 0);')).toBe('code');
  });

  it('classifies code context hint directly', () => {
    expect(classifyKind('a + b', { codeContext: true })).toBe('code');
  });

  it('classifies a single word (<= 40 chars)', () => {
    expect(classifyKind('serendipity')).toBe('word');
    expect(classifyKind("don't")).toBe('word');
    expect(classifyKind('well-known')).toBe('word');
  });

  it('classifies a short single-line as sentence', () => {
    expect(classifyKind('Make it work, then make it right.')).toBe('sentence');
  });

  it('classifies multi-line or long text as paragraph', () => {
    expect(classifyKind('line one\nline two')).toBe('paragraph');
    expect(classifyKind('a'.repeat(281))).toBe('paragraph');
  });

  it('handles empty / whitespace safely', () => {
    expect(classifyKind('')).toBe('paragraph');
    expect(classifyKind('   ')).toBe('paragraph');
    expect(classifyKind(null)).toBe('paragraph');
  });
});

describe('codeLikeness', () => {
  it('scores distinct markers only once each', () => {
    // "function" + "=>" + ";" + "{" = 4
    expect(codeLikeness('function f() { return 1; }')).toBeGreaterThanOrEqual(3);
  });
  it('does not flag a plain sentence', () => {
    expect(codeLikeness('Make it work, then make it right.')).toBe(0);
  });
});

describe('isSingleWord', () => {
  it('accepts hyphens and apostrophes', () => {
    expect(isSingleWord("don't")).toBe(true);
    expect(isSingleWord('well-known')).toBe(true);
  });
  it('rejects spaces and over-long words', () => {
    expect(isSingleWord('two words')).toBe(false);
    expect(isSingleWord('x'.repeat(41))).toBe(false);
  });
});

describe('cleanUrl', () => {
  it('strips utm_* and known tracking params', () => {
    const out = cleanUrl('https://example.com/path?utm_source=x&utm_medium=y&fbclid=z&gclid=g&mc_cid=m&igshid=i&keep=1');
    expect(out).not.toContain('utm_source');
    expect(out).not.toContain('fbclid');
    expect(out).not.toContain('gclid');
    expect(out).not.toContain('mc_cid');
    expect(out).not.toContain('igshid');
    expect(out).toContain('keep=1');
  });
  it('leaves non-http URLs untouched', () => {
    expect(cleanUrl('ftp://example.com')).toBe('ftp://example.com');
  });
  it('returns the input unchanged on malformed URLs', () => {
    expect(cleanUrl('not a url')).toBe('not a url');
  });
});

describe('cleanText', () => {
  it('trims and normalizes CRLF', () => {
    expect(cleanText('  a\r\nb  ').text).toBe('a\nb');
  });
  it('collapses 3+ blank lines to 2', () => {
    expect(cleanText('a\n\n\n\nb').text).toBe('a\n\nb');
  });
  it('caps at MAX_TEXT_LENGTH and flags truncation', () => {
    const res = cleanText('x'.repeat(MAX_TEXT_LENGTH + 100));
    expect(res.text.length).toBe(MAX_TEXT_LENGTH);
    expect(res.truncated).toBe(true);
  });
  it('does not flag truncation for short text', () => {
    expect(cleanText('short').truncated).toBe(false);
  });
});

describe('normalizeText / dedupeKey / findDuplicate', () => {
  it('normalizes words case-insensitively', () => {
    expect(normalizeText('Hello', 'word')).toBe('hello');
    expect(normalizeText('  Keep case  ', 'sentence')).toBe('Keep case');
  });

  it('dedupes on kind + normalized text', () => {
    const a = item({ kind: 'word', text: 'Hello', id: 'a' });
    const b = item({ kind: 'word', text: 'hello', id: 'b' });
    expect(dedupeKey(a)).toBe(dedupeKey(b));
    expect(findDuplicate([a], b)?.id).toBe('a');
  });

  it('does not dedupe across kinds', () => {
    const a = item({ kind: 'word', text: 'hello', id: 'a' });
    const b = item({ kind: 'sentence', text: 'hello', id: 'b' });
    expect(findDuplicate([a], b)).toBeNull();
  });

  it('skips deleted items when finding duplicates', () => {
    const a = item({ kind: 'word', text: 'hello', id: 'a', deletedAt: 10 });
    const b = item({ kind: 'word', text: 'hello', id: 'b' });
    expect(findDuplicate([a], b)).toBeNull();
  });
});

describe('hostFromUrl', () => {
  it('lowercases and strips www', () => {
    expect(hostFromUrl('https://www.React.dev/learn')).toBe('react.dev');
  });
  it('adds https to bare hosts', () => {
    expect(hostFromUrl('example.com')).toBe('example.com');
  });
  it('returns empty string for invalid input', () => {
    expect(hostFromUrl('not a url')).toBe('');
    expect(hostFromUrl('')).toBe('');
  });
});

describe('hostHueColor', () => {
  it('is deterministic', () => {
    expect(hostHueColor('react.dev')).toBe(hostHueColor('react.dev'));
  });
  it('returns an hsl color', () => {
    expect(hostHueColor('react.dev')).toMatch(/^hsl\(\d+, 42%, 40%\)$/);
  });
  it('handles empty input', () => {
    expect(hostHueColor('')).toBe('hsl(0, 42%, 40%)');
  });
});

describe('searchItems', () => {
  const folders = [{ id: 'f1', name: 'Read later' }];
  const items = [
    item({ id: 'a', text: 'React state', title: 'How React', host: 'react.dev' }),
    item({ id: 'b', text: 'a quote', host: 'paulgraham.com', folderIds: ['f1'] }),
    item({ id: 'c', text: 'gone', deletedAt: 5 }),
  ];
  it('matches text', () => {
    expect(searchItems(items, folders, 'state').map((i) => i.id)).toEqual(['a']);
  });
  it('matches title and host', () => {
    expect(searchItems(items, folders, 'how react').map((i) => i.id)).toEqual(['a']);
    expect(searchItems(items, folders, 'paulgraham').map((i) => i.id)).toEqual(['b']);
  });
  it('matches folder names', () => {
    expect(searchItems(items, folders, 'read later').map((i) => i.id)).toEqual(['b']);
  });
  it('skips deleted and returns all for empty query', () => {
    expect(searchItems(items, folders, '')).toHaveLength(2);
    expect(searchItems(items, folders, 'gone')).toHaveLength(0);
  });
});

describe('groupBySite', () => {
  it('groups by host ordered by latest save', () => {
    const items = [
      item({ id: 'a', host: 'react.dev', updatedAt: 100 }),
      item({ id: 'b', host: 'paulgraham.com', updatedAt: 300 }),
      item({ id: 'c', host: 'react.dev', updatedAt: 200 }),
      item({ id: 'd', host: 'react.dev', updatedAt: 150, deletedAt: 1 }),
    ];
    const groups = groupBySite(items);
    expect(groups[0].host).toBe('paulgraham.com');
    expect(groups[1].host).toBe('react.dev');
    expect(groups[1].items).toHaveLength(2); // deleted one excluded
  });
});

describe('timeBucket', () => {
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.getTime();
  };
  it('buckets today / yesterday / week / earlier', () => {
    expect(timeBucket(Date.now())).toBe('today');
    expect(timeBucket(daysAgo(1))).toBe('yesterday');
    expect(timeBucket(daysAgo(3))).toBe('week');
    expect(timeBucket(daysAgo(10))).toBe('earlier');
  });
});

describe('mergeStates', () => {
  it('prefers the higher updatedAt per id', () => {
    const local = { items: [item({ id: 'x', text: 'old', updatedAt: 100 })], folders: [] };
    const remote = { items: [item({ id: 'x', text: 'new', updatedAt: 200 })], folders: [] };
    const merged = mergeStates(local, remote);
    expect(merged.items[0].text).toBe('new');
  });

  it('tombstone beats an equal-time non-tombstone', () => {
    const deletedAt = Date.now() - 1000; // recent tombstone (not purged)
    const local = { items: [item({ id: 'x', deletedAt, updatedAt: 100 })], folders: [] };
    const remote = { items: [item({ id: 'x', deletedAt: null, updatedAt: 100 })], folders: [] };
    const merged = mergeStates(local, remote);
    expect(merged.items[0].deletedAt).toBe(deletedAt);
  });

  it('purges tombstones older than 30 days', () => {
    const old = Date.now() - 31 * 24 * 60 * 60 * 1000;
    const local = { items: [item({ id: 'x', deletedAt: old })], folders: [] };
    const merged = mergeStates(local, { items: [], folders: [] });
    expect(merged.items).toHaveLength(0);
  });

  it('removes a deleted folder id from items', () => {
    const local = {
      items: [item({ id: 'i1', folderIds: ['f1', 'f2'] })],
      folders: [
        { id: 'f1', name: 'Kept', color: 'slate', order: 0, createdAt: 1, updatedAt: 1, deletedAt: null },
        { id: 'f2', name: 'Gone', color: 'slate', order: 1, createdAt: 1, updatedAt: 1, deletedAt: 50 },
      ],
    };
    const merged = mergeStates(local, { items: [], folders: [] });
    expect(merged.items[0].folderIds).toEqual(['f1']);
  });
});

describe('sanitizeImport', () => {
  it('drops records missing id/text or with an invalid kind', () => {
    const out = sanitizeImport({
      items: [
        { text: 'no id' },
        { id: 'a' },
        { id: 'b', text: 'ok', kind: 'sentence' },
        { id: 'c', text: 'bad', kind: 'image' },
      ],
    });
    expect(out.items.map((i) => i.id)).toEqual(['b']);
  });

  it('clamps text length and coerces numbers', () => {
    const out = sanitizeImport({
      items: [{ id: 'a', text: 'x'.repeat(MAX_TEXT_LENGTH + 10), kind: 'paragraph' }],
    });
    expect(out.items[0].text.length).toBe(MAX_TEXT_LENGTH);
    expect(typeof out.items[0].createdAt).toBe('number');
  });

  it('rejects non-object input', () => {
    expect(sanitizeImport(null)).toEqual({ items: [], folders: [] });
    expect(sanitizeImport('nope')).toEqual({ items: [], folders: [] });
  });
});
