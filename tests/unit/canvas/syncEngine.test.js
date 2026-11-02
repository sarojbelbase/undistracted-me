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
import { GIST_SCHEMA_VERSION } from '../../../src/utilities/githubAuth';

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

// ─── notes_index merge on pull ──────────────────────────────────────────────

describe('notes_index merge on pull', () => {
  it('unions local and remote index entries, newer updatedAt wins', async () => {
    localStorage.setItem('notes_index', JSON.stringify({
      a: { gistId: 'g-a', label: 'A', updatedAt: 100 },
      b: { gistId: 'g-b', label: 'B local', updatedAt: 500 },
    }));
    localStorage.setItem('sync_timestamps', JSON.stringify({ notes_index: 1000 }));
    setGist({ notes_index: { v: {
      a: { gistId: 'g-a', label: 'A remote', updatedAt: 300 },
      c: { gistId: 'g-c', label: 'C', updatedAt: 400 },
    }, t: 2000 } });

    const changes = await syncEngine.pullFromSync();

    expect(changes.notes_index).toBe(true);
    const merged = JSON.parse(localStorage.getItem('notes_index'));
    expect(merged.a.updatedAt).toBe(300); // remote newer for `a`
    expect(merged.a.label).toBe('A remote');
    expect(merged.b.updatedAt).toBe(500); // local-only `b` kept
    expect(merged.c.label).toBe('C'); // remote-only `c` added
  });
});

// ─── widget_instances notes stripping / preservation ────────────────────────

describe('widget_instances notes handling', () => {
  it('strips the notes widget settings when pushing widget_instances', async () => {
    const instances = {
      state: {
        instances: [{ id: 'notes', type: 'notes' }],
        widgetSettings: {
          notes: { notes: [{ id: 'n1', text: 'secret note', updatedAt: 1 }], idx: 0 },
          clock: { format: '24h' },
        },
      },
      version: 0,
    };
    localStorage.setItem('widget_instances', JSON.stringify(instances));

    await syncEngine.pushKey('widget_instances');

    const written = JSON.parse(gistContent);
    const pushed = written.keys.widget_instances.v;
    expect(pushed.state.widgetSettings.clock).toEqual({ format: '24h' });
    expect(pushed.state.widgetSettings.notes).toBeUndefined();
  });

  it('preserves local notes when pulling a stripped remote widget_instances', async () => {
    // Local note content lives in the legacy widgetSettings_notes key.
    localStorage.setItem('widgetSettings_notes', JSON.stringify({
      notes: [{ id: 'n1', text: 'local note', updatedAt: 1 }],
      idx: 0,
    }));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_instances: 1000 }));
    setGist({ widget_instances: { v: {
      state: {
        instances: [{ id: 'clock', type: 'clock' }],
        widgetSettings: { clock: { format: '12h' } }, // no notes — stripped remotely
      },
      version: 0,
    }, t: 2000 } });

    const changes = await syncEngine.pullFromSync();

    expect(changes.widget_instances).toBe(true);
    const local = JSON.parse(localStorage.getItem('widget_instances'));
    expect(local.state.widgetSettings.clock.format).toBe('12h'); // remote adopted
    expect(local.state.widgetSettings.notes.notes[0].text).toBe('local note'); // notes preserved
  });
});

// ─── change detection + throttle ────────────────────────────────────────────

describe('change detection and throttle', () => {
  it('pushAll skips the gist write when nothing changed', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }]));
    await syncEngine.pushKey('widget_events'); // pushes once

    const before = gistContent;
    const result = await syncEngine.pushAll();

    expect(result.changed).toBe(false);
    expect(gistContent).toBe(before); // no write happened
  });

  it('pushAll reports a change when local differs from remote', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }]));
    await syncEngine.pushKey('widget_events'); // remote now has id:1

    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }, { id: 2, title: 'e2' }]));
    const result = await syncEngine.pushAll();

    expect(result.changed).toBe(true);
  });

  it('forceSync is throttled right after a successful sync', async () => {
    // enableSync (beforeEach) set lastSyncAt = now()
    const result = await syncEngine.forceSync();
    expect(result.changed).toBe(false);
    expect(result.reason).toBe('recently-synced');
  });

  it('forceSync reports no-changes when local and remote match', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }]));
    await syncEngine.pushKey('widget_events'); // sync so remote == local

    // Advance past the 5-minute throttle.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);
    const result = await syncEngine.forceSync();
    vi.useRealTimers();

    expect(result.changed).toBe(false);
    expect(result.reason).toBe('no-changes');
  });

  it('forceSync reports a change when local has new data', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 6 * 60 * 1000);

    localStorage.setItem('widget_events', JSON.stringify([{ id: 9, title: 'new' }]));
    const result = await syncEngine.forceSync();
    vi.useRealTimers();

    expect(result.changed).toBe(true);
    expect(result.reason).toBe('synced');
  });
});

// ─── schema versioning ──────────────────────────────────────────────────────

describe('schema versioning', () => {
  it('skips the pull when the remote gist is from a newer schema', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'local' }]));
    localStorage.setItem('sync_timestamps', JSON.stringify({ widget_events: 0 }));
    gistContent = JSON.stringify({
      v: GIST_SCHEMA_VERSION + 1,
      deviceId: 'dev',
      updatedAt: 0,
      keys: { widget_events: { v: [{ id: 2, title: 'remote' }], t: 9999 } },
    });

    const changes = await syncEngine.pullFromSync();

    expect(changes).toEqual({});
    // Local data is left untouched — we refuse to parse a newer schema.
    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([{ id: 1, title: 'local' }]);
  });
});
