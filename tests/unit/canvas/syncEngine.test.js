/**
 * Unit tests for src/utilities/syncEngine.js (GitHub gist transport)
 *
 * Covers:
 *  - pullFromSync last-write-wins merge (remote newer → adopt, local newer →
 *    keep, malformed remote skipped)
 *  - sanitizeForSync via pushKey (GCal event stripping + array trimming, and
 *    Zustand-wrapper passthrough for settings)
 *
 * The `enabled` flag is module-private and only set by enableSync(), so each
 * test enables sync first against a mocked chrome.storage.local + fetch
 * (simulating a private GitHub gist).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import syncEngine from '../../../src/utilities/syncEngine';

const GIST_ID = 'gist-123';
const FILENAME = 'undistracted-me-sync.json';
const GISTS_API = 'https://api.github.com/gists';

// ─── Mocks ──────────────────────────────────────────────────────────────────

let localStore; // simulated chrome.storage.local
let gistContent; // current gist file content (string) — null means "no gist"

function json(data, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => data };
}

function stubChrome() {
  localStore = { github_gist_token: 'token-abc' };
  vi.stubGlobal('chrome', {
    runtime: { id: 'test-ext' },
    storage: {
      local: {
        get: vi.fn(async (key) => {
          const out = {};
          const pick = (k) => { if (k in localStore) out[k] = localStore[k]; };
          if (Array.isArray(key)) key.forEach(pick);
          else if (typeof key === 'string') pick(key);
          return out;
        }),
        set: vi.fn(async (obj) => Object.assign(localStore, obj)),
        remove: vi.fn(async (keys) => {
          (Array.isArray(keys) ? keys : [keys]).forEach((k) => { delete localStore[k]; });
        }),
      },
    },
  });
}

function stubFetch() {
  gistContent = null;
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();

    if (u === GISTS_API && method === 'POST') {
      gistContent = JSON.parse(opts.body).files[FILENAME].content;
      return json({ id: GIST_ID, files: { [FILENAME]: { content: gistContent } } }, 201);
    }
    if (u === `${GISTS_API}/${GIST_ID}` && method === 'PATCH') {
      gistContent = JSON.parse(opts.body).files[FILENAME].content;
      return json({ id: GIST_ID }, 200);
    }
    if (u === `${GISTS_API}/${GIST_ID}` && method === 'GET') {
      if (gistContent == null) return json({ message: 'Not Found' }, 404);
      return json({ id: GIST_ID, files: { [FILENAME]: { content: gistContent } } });
    }
    return json({}, 404);
  }));
}

/** Seed the gist with the given `keys` map. */
function setGist(keys) {
  gistContent = JSON.stringify({ v: 1, deviceId: 'dev_x', updatedAt: 0, keys });
}

// ─── Lifecycle ───────────────────────────────────────────────────────────────

beforeEach(async () => {
  localStorage.clear();
  stubChrome();
  // gist id lives in localStorage (non-secret); the token stays in chrome.storage.local
  localStorage.setItem('github_gist_id', GIST_ID);
  stubFetch();
  await syncEngine.enableSync();
});

afterEach(() => {
  syncEngine.disableSync();
  localStorage.clear();
  vi.unstubAllGlobals();
});

// ─── pullFromSync — last-write-wins ─────────────────────────────────────────

describe('pullFromSync last-write-wins merge', () => {
  it('adopts the remote value when its timestamp is newer', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 1000 }));
    setGist({ widget_events: { v: [{ id: 2, title: 'remote' }], t: 2000 } });

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
    setGist({ widget_events: { v: [{ id: 2, title: 'remote' }], t: 2000 } });

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 1, title: 'local' },
    ]);
  });

  it('does not adopt on equal timestamps (strictly newer required)', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 2000 }));
    setGist({ widget_events: { v: [{ id: 2, title: 'remote' }], t: 2000 } });

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 1, title: 'local' },
    ]);
  });

  it('skips remote entries missing a numeric timestamp', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 0 }));
    setGist({ widget_events: { v: [{ id: 2, title: 'remote' }] } }); // no `t`

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_events).toBeUndefined();
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([
      { id: 1, title: 'local' },
    ]);
  });
});

// ─── sanitizeForSync (via pushKey) ──────────────────────────────────────────

describe('sanitizeForSync via pushKey', () => {
  it('strips GCal events and trims the events array to the max entry cap', async () => {
    const gcal = { id: 'gcal', title: 'GCAL', source: 'gcal' };
    const native = Array.from({ length: 210 }, (_, i) => ({ id: i, title: `e${i}` }));
    localStorage.setItem('widget_events', JSON.stringify([gcal, ...native]));

    await syncEngine.pushKey('widget_events');

    const written = JSON.parse(gistContent);
    const pushed = written.keys.widget_events.v;
    expect(Array.isArray(pushed)).toBe(true);
    expect(pushed).toHaveLength(200);
    expect(pushed.some((e) => e.source === 'gcal' || e.gcalEventId)).toBe(false);
  });

  it('trims the bookmarks array to the max entry cap', async () => {
    const bookmarks = Array.from({ length: 150 }, (_, i) => ({ id: i, url: `https://e${i}.com` }));
    localStorage.setItem('widget_bookmarks', JSON.stringify(bookmarks));

    await syncEngine.pushKey('widget_bookmarks');

    const written = JSON.parse(gistContent);
    expect(written.keys.widget_bookmarks.v).toHaveLength(100);
  });

  it('passes the Zustand settings wrapper through unchanged', async () => {
    const wrapper = { state: { accent: 'Matte Black', mode: 'dark' }, version: 0 };
    localStorage.setItem('undistracted_settings', JSON.stringify(wrapper));

    await syncEngine.pushKey('undistracted_settings');

    const written = JSON.parse(gistContent);
    expect(written.keys.undistracted_settings.v).toEqual(wrapper);
  });
});
