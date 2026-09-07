/**
 * Unit tests for src/utilities/syncEngine.js
 *
 * Covers:
 *  - pullFromSync last-write-wins merge (remote newer → adopt, local newer →
 *    keep, malformed remote skipped)
 *  - sanitizeForSync via pushKey (GCal event stripping + array trimming, and
 *    Zustand-wrapper passthrough for settings)
 *
 * The `enabled` flag is module-private and only set by enableSync(), so each
 * test enables sync first against a mocked chrome.storage.sync.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import syncEngine from '../../../src/utilities/syncEngine';

// ─── Chrome mock state ──────────────────────────────────────────────────────

let syncStore; // simulated chrome.storage.sync

function stubChrome() {
  syncStore = {};
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-ext' },
    storage: {
      sync: {
        get: vi.fn(async (keys) => {
          const result = {};
          const pick = (k) => { if (k in syncStore) result[k] = syncStore[k]; };
          if (Array.isArray(keys)) keys.forEach(pick);
          else if (typeof keys === 'string') pick(keys);
          else if (keys && typeof keys === 'object') Object.keys(keys).forEach(pick);
          return result;
        }),
        set: vi.fn(async (obj) => { Object.assign(syncStore, obj); }),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  });
}

beforeEach(async () => {
  localStorage.clear();
  stubChrome();
  await syncEngine.enableSync();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

// ─── pullFromSync — last-write-wins ────────────────────────────────────────

describe('pullFromSync last-write-wins merge', () => {
  it('adopts the remote value when its timestamp is newer', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 1000 }));
    syncStore['sync_v1_events'] = { v: [{ id: 2, title: 'remote' }], t: 2000 };

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBe(true);
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 2, title: 'remote' },
    ]);
    expect(JSON.parse(localStorage.getItem('sync_timestamps')).widget_events).toBe(2000);
  });

  it('keeps the local value when its timestamp is newer', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 3000 }));
    syncStore['sync_v1_events'] = { v: [{ id: 2, title: 'remote' }], t: 2000 };

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 1, title: 'local' },
    ]);
  });

  it('does not adopt on equal timestamps (strictly newer required)', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 2000 }));
    syncStore['sync_v1_events'] = { v: [{ id: 2, title: 'remote' }], t: 2000 };

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 1, title: 'local' },
    ]);
  });

  it('skips remote entries missing a numeric timestamp', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 0 }));
    syncStore['sync_v1_events'] = { v: [{ id: 2, title: 'remote' }] }; // no `t`

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 1, title: 'local' },
    ]);
  });
});

// ─── sanitizeForSync (via pushKey) ─────────────────────────────────────────

describe('sanitizeForSync via pushKey', () => {
  it('strips GCal events and trims the events array to the max entry cap', async () => {
    const gcal = { id: 'gcal', title: 'GCAL', source: 'gcal' };
    const native = Array.from({ length: 210 }, (_, i) => ({ id: i, title: `e${i}` }));
    localStorage.setItem('widget_events', JSON.stringify([gcal, ...native]));

    await syncEngine.pushKey('widget_events');

    const pushed = syncStore['sync_v1_events'].v;
    expect(Array.isArray(pushed)).toBe(true);
    expect(pushed).toHaveLength(200);
    expect(pushed.some((e) => e.source === 'gcal' || e.gcalEventId)).toBe(false);
  });

  it('trims the bookmarks array to the max entry cap', async () => {
    const bookmarks = Array.from({ length: 150 }, (_, i) => ({ id: i, url: `https://e${i}.com` }));
    localStorage.setItem('widget_bookmarks', JSON.stringify(bookmarks));

    await syncEngine.pushKey('widget_bookmarks');

    expect(syncStore['sync_v1_bookmarks'].v).toHaveLength(100);
  });

  it('passes the Zustand settings wrapper through unchanged', async () => {
    const wrapper = { state: { accent: 'Matte Black', mode: 'dark' }, version: 0 };
    localStorage.setItem('undistracted_settings', JSON.stringify(wrapper));

    await syncEngine.pushKey('undistracted_settings');

    expect(syncStore['sync_v1_settings'].v).toEqual(wrapper);
  });
});
