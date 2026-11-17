/**
 * Unit tests for the Pocket Phase 2 pure helpers: selectors, textFragment,
 * previewLines, and the new utils additions.
 */

import { describe, it, expect } from 'vitest';
import {
  liveItems,
  liveFolders,
  sortedItems,
  totalCount,
  countByKind,
  countByFolder,
  filterItems,
  storageSize,
  formatBytes,
  groupByDate,
} from '../../../app/widgets/pocket/selectors';
import {
  collapseWhitespace,
  buildTextFragment,
  encodeFragment,
  quoteUrl,
} from '../../../app/widgets/pocket/textFragment';
import { previewClamp, widgetClamp, isClamped } from '../../../app/widgets/pocket/previewLines';
import {
  isIpOrLocalHost,
  nextFolderColor,
  groupByPage,
  detectLanguage,
  folderNameTaken,
  middleEllipsis,
  formatSavedDate,
} from '../../../app/widgets/pocket/utils';

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

describe('selectors', () => {
  const items = [
    item({ id: 'a', kind: 'sentence', updatedAt: 100 }),
    item({ id: 'b', kind: 'code', updatedAt: 300, folderIds: ['f1'] }),
    item({ id: 'c', kind: 'sentence', updatedAt: 200, deletedAt: 5 }),
  ];
  it('excludes soft-deleted items from every count', () => {
    expect(totalCount(items)).toBe(2);
    expect(liveItems(items)).toHaveLength(2);
  });
  it('sorts newest first', () => {
    expect(sortedItems(items).map((i) => i.id)).toEqual(['b', 'a']);
  });
  it('counts by kind and folder', () => {
    const byKind = countByKind(items);
    expect(byKind.get('sentence')).toBe(1);
    expect(byKind.get('code')).toBe(1);
    expect(countByFolder(items).get('f1')).toBe(1);
  });
  it('filters by kind and folder', () => {
    expect(filterItems(items, { type: 'kind', value: 'sentence' }).map((i) => i.id)).toEqual(['a']);
    expect(filterItems(items, { type: 'folder', value: 'f1' }).map((i) => i.id)).toEqual(['b']);
  });
  it('formats bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
  });
  it('storageSize returns a number', () => {
    expect(typeof storageSize(items, [])).toBe('number');
  });
  it('groups by date bucket in order', () => {
    const now = Date.now();
    const yesterday = new Date(Date.now() - 86400000).getTime();
    const buckets = groupByDate([item({ updatedAt: yesterday }), item({ updatedAt: now })]);
    expect(buckets[0].key).toBe('today');
    expect(buckets[buckets.length - 1].key).toBe('yesterday');
  });
});

describe('textFragment', () => {
  it('collapses whitespace', () => {
    expect(collapseWhitespace('  a\n\n b\t ')).toBe('a b');
  });
  it('returns full text when ≤ 120 chars', () => {
    expect(buildTextFragment('a short quote', 'sentence')).toBe('a short quote');
  });
  it('returns first6,last6 for long text', () => {
    const long = Array.from({ length: 40 }, (_, i) => `word${i}`).join(' ');
    expect(buildTextFragment(long, 'paragraph')).toBe(
      'word0 word1 word2 word3 word4 word5,word34 word35 word36 word37 word38 word39',
    );
  });
  it('uses the first line only for code', () => {
    expect(buildTextFragment('const x = 1;\nreturn x;', 'code')).toBe('const x = 1;');
  });
  it('percent-encodes -, , and &', () => {
    const enc = encodeFragment('a-b,c&d');
    expect(enc).toContain('%2D');
    expect(enc).toContain('%2C');
    expect(enc).toContain('%26');
  });
  it('strips an existing hash and appends the directive', () => {
    const url = quoteUrl('https://example.com/page#old', 'hello world', 'sentence');
    expect(url).toBe('https://example.com/page#:~:text=hello%20world');
  });
  it('returns the base URL when there is nothing to quote', () => {
    expect(quoteUrl('https://example.com', '', 'sentence')).toBe('https://example.com');
  });
});

describe('previewLines', () => {
  it('maps preview length to paragraph/code line counts', () => {
    expect(previewClamp('paragraph', 'short')).toBe(3);
    expect(previewClamp('paragraph', 'long')).toBe(8);
    expect(previewClamp('code', 'medium')).toBe(6);
  });
  it('clamps sentence to 2 and link to 1', () => {
    expect(previewClamp('sentence', 'long')).toBe(2);
    expect(previewClamp('link', 'long')).toBe(1);
  });
  it('uses fixed widget clamps', () => {
    expect(widgetClamp('code')).toBe(3);
    expect(widgetClamp('paragraph')).toBe(2);
    expect(widgetClamp('sentence')).toBe(2);
  });
  it('detects clamped text', () => {
    expect(isClamped('a\nb\nc', 2)).toBe(true);
    expect(isClamped('short', 3)).toBe(false);
  });
});

describe('utils additions', () => {
  it('isIpOrLocalHost detects IPs, localhost and empty hosts', () => {
    expect(isIpOrLocalHost('192.168.0.1')).toBe(true);
    expect(isIpOrLocalHost('localhost')).toBe(true);
    expect(isIpOrLocalHost('')).toBe(true);
    expect(isIpOrLocalHost('react.dev')).toBe(false);
  });

  it('nextFolderColor never returns slate and picks unused colors first', () => {
    const folders = [
      { id: 'f1', name: 'A', color: 'blue', deletedAt: null },
      { id: 'f2', name: 'B', color: 'amber', deletedAt: null },
    ];
    const c = nextFolderColor(folders);
    expect(c).not.toBe('slate');
    expect(c).not.toBe('blue');
    expect(c).not.toBe('amber');
  });

  it('groupByPage separates pages from ungrouped and flags multiPage', () => {
    const items = [
      item({ id: 'a', sourceUrl: 'https://x.dev/p1', title: 'One', updatedAt: 100 }),
      item({ id: 'b', sourceUrl: 'https://x.dev/p2', title: 'Two', updatedAt: 300 }),
      item({ id: 'c', sourceUrl: 'https://x.dev/p1', updatedAt: 200 }),
      item({ id: 'd', text: 'pasted', updatedAt: 50 }),
    ];
    const g = groupByPage(items);
    expect(g.multiPage).toBe(true);
    expect(g.pages).toHaveLength(2);
    expect(g.pages[0].pageUrl).toBe('https://x.dev/p2');
    expect(g.ungrouped.map((i) => i.id)).toEqual(['d']);
  });

  it('detectLanguage returns a sensible label', () => {
    expect(detectLanguage('const x = () => 1;')).toBe('JavaScript');
    expect(detectLanguage('def foo():\n  pass')).toBe('Python');
    expect(detectLanguage('<div>hi</div>')).toBe('HTML');
    expect(detectLanguage('{"a": 1}')).toBe('JSON');
    expect(detectLanguage('just some text')).toBe('Code');
  });

  it('folderNameTaken is case-insensitive and skips the exceptId', () => {
    const folders = [{ id: 'f1', name: 'Read Later', deletedAt: null }];
    expect(folderNameTaken(folders, 'read later')).toBe(true);
    expect(folderNameTaken(folders, 'read later', 'f1')).toBe(false);
    expect(folderNameTaken(folders, 'new')).toBe(false);
  });

  it('middleEllipsis truncates long strings', () => {
    const out = middleEllipsis('https://example.com/a/very/long/path', 20);
    expect(out.length).toBeLessThanOrEqual(20);
    expect(out).toContain('…');
  });

  it('formatSavedDate produces a readable absolute date', () => {
    const d = new Date(2026, 10, 17, 9, 12).getTime();
    expect(formatSavedDate(d)).toContain('Tue');
    expect(formatSavedDate(d)).toContain('09:12');
  });
});
