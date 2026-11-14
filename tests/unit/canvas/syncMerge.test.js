/**
 * Unit tests for app/utilities/syncMerge.js (pure LWW element-set merge).
 */

import { describe, it, expect } from 'vitest';
import {
  itemKey,
  deepEqual,
  arrayToElementSet,
  mergeElementSets,
  elementSetToArray,
  mapToElementSet,
  elementSetToObject,
} from '../../../app/utilities/syncMerge';

describe('itemKey', () => {
  it('prefers id, then url, then name', () => {
    expect(itemKey({ id: 'a' })).toBe('a');
    expect(itemKey({ url: 'https://x' })).toBe('https://x');
    expect(itemKey({ name: 'n' })).toBe('n');
  });
  it('returns empty string for missing identity', () => {
    expect(itemKey({ title: 'no id' })).toBe('');
    expect(itemKey(null)).toBe('');
  });
});

describe('deepEqual', () => {
  it('ignores key order for objects', () => {
    expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true);
  });
  it('detects differing values', () => {
    expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
    expect(deepEqual([1, 2], [1, 3])).toBe(false);
  });
});

describe('arrayToElementSet', () => {
  it('assigns a fresh timestamp to new items', () => {
    const { items, deleted } = arrayToElementSet([{ id: 'a', v: 1 }], { items: {}, deleted: {} }, 100);
    expect(items.a).toEqual({ v: { id: 'a', v: 1 }, t: 100 });
    expect(Object.keys(deleted)).toHaveLength(0);
  });

  it('keeps the previous timestamp for unchanged items', () => {
    const meta = { items: { a: { v: { id: 'a', v: 1 }, t: 50 } }, deleted: {} };
    const { items } = arrayToElementSet([{ id: 'a', v: 1 }], meta, 100);
    expect(items.a.t).toBe(50);
  });

  it('bumps the timestamp for edited items', () => {
    const meta = { items: { a: { v: { id: 'a', v: 1 }, t: 50 } }, deleted: {} };
    const { items } = arrayToElementSet([{ id: 'a', v: 2 }], meta, 100);
    expect(items.a.t).toBe(100);
    expect(items.a.v.v).toBe(2);
  });

  it('tombstones items removed from the array', () => {
    const meta = { items: { a: { v: { id: 'a' }, t: 50 } }, deleted: {} };
    const { items, deleted } = arrayToElementSet([], meta, 100);
    expect(items.a).toBeUndefined();
    expect(deleted.a).toBe(100);
  });

  it('clears a tombstone when the item is re-added', () => {
    const meta = { items: {}, deleted: { a: 100 } };
    const { deleted } = arrayToElementSet([{ id: 'a' }], meta, 200);
    expect(deleted.a).toBeUndefined();
  });
});

describe('mergeElementSets', () => {
  it('unions items present on only one side', () => {
    const a = { items: { x: { v: { id: 'x' }, t: 10 } }, deleted: {} };
    const b = { items: { y: { v: { id: 'y' }, t: 20 } }, deleted: {} };
    const m = mergeElementSets(a, b);
    expect(m.items.x).toBeDefined();
    expect(m.items.y).toBeDefined();
  });

  it('keeps the higher timestamp on same-id conflict', () => {
    const a = { items: { x: { v: { id: 'x', n: 'old' }, t: 10 } }, deleted: {} };
    const b = { items: { x: { v: { id: 'x', n: 'new' }, t: 20 } }, deleted: {} };
    const m = mergeElementSets(a, b);
    expect(m.items.x.v.n).toBe('new');
    expect(m.items.x.t).toBe(20);
  });

  it('a delete beats an older write (tombstone)', () => {
    const a = { items: { x: { v: { id: 'x' }, t: 10 } }, deleted: {} };
    const b = { items: {}, deleted: { x: 30 } };
    const m = mergeElementSets(a, b);
    expect(m.items.x).toBeUndefined();
    expect(m.deleted.x).toBe(30);
  });

  it('a write beats an older delete (resurrection)', () => {
    const a = { items: {}, deleted: { x: 10 } };
    const b = { items: { x: { v: { id: 'x' }, t: 30 } }, deleted: {} };
    const m = mergeElementSets(a, b);
    expect(m.items.x).toBeDefined();
  });
});

describe('elementSetToArray', () => {
  it('preserves local order and appends remote-only items', () => {
    const set = {
      items: {
        a: { v: { id: 'a' }, t: 1 },
        b: { v: { id: 'b' }, t: 2 },
        c: { v: { id: 'c' }, t: 3 },
      },
      deleted: {},
    };
    const local = [{ id: 'b' }, { id: 'a' }]; // local order: b, a
    const arr = elementSetToArray(set, local);
    expect(arr.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });

  it('drops tombstoned items', () => {
    const set = { items: { a: { v: { id: 'a' }, t: 1 } }, deleted: { b: 100 } };
    const arr = elementSetToArray(set, [{ id: 'a' }, { id: 'b' }]);
    expect(arr.map((x) => x.id)).toEqual(['a']);
  });
});

describe('mapToElementSet / elementSetToObject', () => {
  it('round-trips an object into an element set and back', () => {
    const { items, deleted } = mapToElementSet({ accent: 'red', language: 'en' }, null, 100);
    expect(items.accent).toEqual({ v: 'red', t: 100 });
    expect(items.language).toEqual({ v: 'en', t: 100 });
    expect(Object.keys(deleted)).toHaveLength(0);
    expect(elementSetToObject({ items, deleted })).toEqual({ accent: 'red', language: 'en' });
  });

  it('keeps unchanged values at their previous timestamp', () => {
    const meta = { items: { accent: { v: 'red', t: 40 } }, deleted: {} };
    const { items } = mapToElementSet({ accent: 'red' }, meta, 100);
    expect(items.accent.t).toBe(40);
  });

  it('bumps changed values and tombstones removed keys', () => {
    const meta = { items: { accent: { v: 'red', t: 40 }, language: { v: 'en', t: 40 } }, deleted: {} };
    const { items, deleted } = mapToElementSet({ accent: 'blue' }, meta, 100);
    expect(items.accent.t).toBe(100);
    expect(deleted.language).toBe(100);
  });
});
