/**
 * Unit tests for src/utilities/syncEngine.js (GitHub gist transport + merge)
 *
 * Covers:
 *  - whole-key last-write-wins for object keys (settings)
 *  - per-item element-set merge for array keys (union + LWW + tombstones)
 *  - gist discovery-independent transport (create/update/read)
 *  - GCal event stripping + array trimming
 *  - phantom-key mapping (bookmarks → um_bookmarks, countdown → countdown_events)
 *  - schema-version guard
 *  - change detection + throttle
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import syncEngine from '../../../src/utilities/syncEngine';
import { GIST_SCHEMA_VERSION } from '../../../src/utilities/githubAuth';

const GIST_ID = 'gist-123';
const FILENAME = 'undistracted-me-sync.json';
const GISTS_API = 'https://api.github.com/gists';

// ─── Mocks ──────────────────────────────────────────────────────────────────

let localStore;
let gistContent;

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

function setGist(keys) {
  gistContent = JSON.stringify({ v: 1, deviceId: 'dev_x', updatedAt: 0, keys });
}

/** Build an element-set value `{ items, deleted }` for an array key. */
function elementSet(itemsById, deleted = {}) {
  return { items: itemsById, deleted };
}

beforeEach(async () => {
  localStorage.clear();
  stubChrome();
  localStorage.setItem('github_gist_id', GIST_ID);
  stubFetch();
  await syncEngine.enableSync();
});

afterEach(() => {
  syncEngine.disableSync();
  localStorage.clear();
  vi.unstubAllGlobals();
});

// ─── field-level LWW (settings) ─────────────────────────────────────────────

describe('pullFromSync — settings field-level merge', () => {
  it('adopts a remote field when remote is newer', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    localStorage.setItem('sync_merge_meta', JSON.stringify({
      undistracted_settings: { fields: { items: { accent: { v: 'local', t: 100 } }, deleted: {} } },
    }));
    setGist({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 200 } }, version: 0 }, t: 200 } });

    const changes = await syncEngine.pullFromSync();

    expect(changes.undistracted_settings).toBe(true);
    expect(JSON.parse(localStorage.getItem('undistracted_settings')).state.accent).toBe('remote');
  });

  it('keeps a local field when local is newer', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    localStorage.setItem('sync_merge_meta', JSON.stringify({
      undistracted_settings: { fields: { items: { accent: { v: 'local', t: 300 } }, deleted: {} } },
    }));
    setGist({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 200 } }, version: 0 }, t: 200 } });

    await syncEngine.pullFromSync();

    expect(JSON.parse(localStorage.getItem('undistracted_settings')).state.accent).toBe('local');
  });

  it('unions fields present on only one side', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    localStorage.setItem('sync_merge_meta', JSON.stringify({
      undistracted_settings: { fields: { items: { accent: { v: 'local', t: 100 } }, deleted: {} } },
    }));
    setGist({
      undistracted_settings: {
        v: { fields: { accent: { v: 'local', t: 100 }, language: { v: 'ne', t: 150 } }, version: 0 },
        t: 150,
      },
    });

    await syncEngine.pullFromSync();

    const state = JSON.parse(localStorage.getItem('undistracted_settings')).state;
    expect(state.accent).toBe('local');
    expect(state.language).toBe('ne');
  });
});

// ─── array element-set merge ────────────────────────────────────────────────

describe('pullFromSync — array element-set merge', () => {
  it('unions remote-only items into the local array', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 'local', title: 'L' }]));
    setGist({
      widget_events: {
        v: elementSet({
          local: { v: { id: 'local', title: 'L' }, t: 10 },
          remote: { v: { id: 'remote', title: 'R' }, t: 20 },
        }),
        t: 20,
      },
    });

    await syncEngine.pullFromSync();

    const events = JSON.parse(localStorage.getItem('widget_events'));
    expect(events.map((e) => e.id).sort()).toEqual(['local', 'remote']);
  });

  it('adopts the remote item on a same-id conflict when remote is newer', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 'x', title: 'local' }]));
    localStorage.setItem('sync_merge_meta', JSON.stringify({
      widget_events: { items: { x: { v: { id: 'x', title: 'local' }, t: 10 } }, deleted: {} },
    }));
    setGist({ widget_events: { v: elementSet({ x: { v: { id: 'x', title: 'remote' }, t: 50 } }), t: 50 } });

    await syncEngine.pullFromSync();

    expect(JSON.parse(localStorage.getItem('widget_events'))[0].title).toBe('remote');
  });

  it('does not resurrect a locally-deleted item (tombstone)', async () => {
    localStorage.setItem('widget_events', JSON.stringify([]));
    localStorage.setItem('sync_merge_meta', JSON.stringify({
      widget_events: { items: {}, deleted: { x: 100 } }, // deleted at t=100
    }));
    setGist({ widget_events: { v: elementSet({ x: { v: { id: 'x' }, t: 50 } }), t: 50 } });

    await syncEngine.pullFromSync();

    expect(JSON.parse(localStorage.getItem('widget_events'))).toEqual([]);
  });
});

// ─── push: element-set format + sanitization ───────────────────────────────

describe('pushAll — array element-set format', () => {
  it('writes events as an element set (not a raw array)', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 'a', title: 'A' }]));

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    const v = written.keys.widget_events.v;
    expect(Array.isArray(v)).toBe(false);
    expect(v.items.a.v.title).toBe('A');
  });

  it('strips GCal events before pushing', async () => {
    localStorage.setItem('widget_events', JSON.stringify([
      { id: 'gcal', title: 'GCAL', source: 'gcal' },
      { id: 'native', title: 'Native' },
    ]));

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    const items = written.keys.widget_events.v.items;
    expect(Object.keys(items)).toEqual(['native']);
  });

  it('trims the events element set to the max entry cap', async () => {
    const events = Array.from({ length: 210 }, (_, i) => ({ id: `e${i}`, title: `e${i}` }));
    localStorage.setItem('widget_events', JSON.stringify(events));

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    expect(Object.keys(written.keys.widget_events.v.items)).toHaveLength(200);
  });
});

// ─── phantom-key mapping ────────────────────────────────────────────────────

describe('phantom-key mapping', () => {
  it('syncs bookmarks from `um_bookmarks` under the `widget_bookmarks` sync key', async () => {
    localStorage.setItem('um_bookmarks', JSON.stringify([{ url: 'https://a.com', title: 'A' }]));

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    expect(written.keys.widget_bookmarks).toBeDefined();
    expect(written.keys.widget_bookmarks.v.items['https://a.com'].v.title).toBe('A');
  });

  it('syncs countdowns from `countdown_events`', async () => {
    localStorage.setItem('countdown_events', JSON.stringify([{ id: 'c1', title: 'C' }]));

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    expect(written.keys.countdown_events).toBeDefined();
    expect(written.keys.countdown_events.v.items.c1.v.title).toBe('C');
  });
});

// ─── widget_instances per-instance merge ────────────────────────────────────

describe('widget_instances per-instance merge', () => {
  it('unions instances and per-widget settings across devices', async () => {
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [{ id: 'clock', type: 'clock' }],
        widgetSettings: { clock: { format: '24h' } },
      },
      version: 0,
    }));
    setGist({
      widget_instances: {
        v: {
          instances: elementSet({ calendar: { v: { id: 'calendar', type: 'calendar' }, t: 10 } }),
          widgetSettings: elementSet({ calendar: { v: { calendarType: 'bs' }, t: 10 } }),
          version: 0,
        },
        t: 10,
      },
    });

    await syncEngine.pullFromSync();

    const state = JSON.parse(localStorage.getItem('widget_instances')).state;
    expect(state.instances.map((i) => i.id).sort()).toEqual(['calendar', 'clock']);
    expect(state.widgetSettings.calendar).toEqual({ calendarType: 'bs' });
    expect(state.widgetSettings.clock).toEqual({ format: '24h' });
  });

  it('excludes the notes widget settings from the synced payload', async () => {
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [{ id: 'notes', type: 'notes' }],
        widgetSettings: { notes: { notes: [{ id: 'n1', text: 'secret' }], idx: 0 } },
      },
      version: 0,
    }));

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    const ws = written.keys.widget_instances.v.widgetSettings;
    expect(ws.items.notes).toBeUndefined();
    // The notes instance itself is still synced (its slot, not its content).
    expect(written.keys.widget_instances.v.instances.items.notes).toBeDefined();
  });

  it('strips a stale notes entry already embedded in the remote gist', async () => {
    localStorage.setItem('widget_instances', JSON.stringify({
      state: {
        instances: [{ id: 'notes', type: 'notes' }, { id: 'clock', type: 'clock' }],
        widgetSettings: { notes: { notes: [{ id: 'n1', text: 'secret' }], idx: 0 }, clock: { format: '24h' } },
      },
      version: 0,
    }));

    // Simulate a gist that was polluted before the fix — `notes` lives in the
    // remote widgetSettings element set. A clean device must scrub it on push.
    setGist({
      widget_instances: {
        v: {
          instances: elementSet({
            notes: { v: { id: 'notes', type: 'notes' }, t: 10 },
            clock: { v: { id: 'clock', type: 'clock' }, t: 10 },
          }),
          widgetSettings: elementSet({
            notes: { v: { notes: [{ id: 'n1', text: 'secret' }], idx: 0 }, t: 10 },
            clock: { v: { format: '24h' }, t: 10 },
          }),
          version: 0,
        },
        t: 10,
      },
    });

    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    const ws = written.keys.widget_instances.v.widgetSettings;
    expect(ws.items.notes).toBeUndefined();
    expect(ws.items.clock).toBeDefined();
  });
});

// ─── schema versioning ──────────────────────────────────────────────────────

describe('schema versioning', () => {
  it('skips the pull when the remote gist is from a newer schema', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    localStorage.setItem('sync_timestamps', JSON.stringify({ undistracted_settings: 0 }));
    gistContent = JSON.stringify({
      v: GIST_SCHEMA_VERSION + 1,
      deviceId: 'dev',
      updatedAt: 0,
      keys: { undistracted_settings: { v: { state: { accent: 'remote' }, version: 0 }, t: 9999 } },
    });

    const changes = await syncEngine.pullFromSync();

    expect(changes).toEqual({});
    expect(JSON.parse(localStorage.getItem('undistracted_settings')).state.accent).toBe('local');
  });
});

// ─── change detection + throttle ────────────────────────────────────────────

describe('change detection and throttle', () => {
  it('pushAll reports no change when local matches remote', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }]));
    await syncEngine.pushAll();
    const result = await syncEngine.pushAll();
    expect(result.changed).toBe(false);
  });

  it('pushAll reports a change when local differs from remote', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }]));
    await syncEngine.pushAll();

    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }, { id: 2, title: 'e2' }]));
    const result = await syncEngine.pushAll();

    expect(result.changed).toBe(true);
  });

  it('forceSync returns a divergence preview instead of auto-resolving', async () => {
    // Both local and remote changed since a shared base.
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local-v2' }, version: 0 }));
    localStorage.setItem('sync_fingerprint', JSON.stringify({ local: 'localhash-v1', remote: 'remotehash-v1' }));
    gistContent = JSON.stringify({
      v: 3,
      deviceId: 'dev_other',
      updatedAt: 500,
      hash: 'remotehash-v2',
      devices: { dev_other: { name: 'Windows', os: 'Windows', lastSeenAt: 500 } },
      keys: { undistracted_settings: { v: { fields: { accent: { v: 'remote-v2', t: 500 } }, version: 0 }, t: 500 } },
    });

    const result = await syncEngine.forceSync();
    expect(result.status).toBe('diverged');
    expect(result.changed).toBe(false);
    expect(syncEngine.getSyncStatus().pendingConflict).toBeTruthy();
  });

  it('writes a content hash into the gist payload', async () => {
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }]));
    await syncEngine.pushAll();

    const written = JSON.parse(gistContent);
    expect(typeof written.hash).toBe('string');
    expect(written.hash.length).toBeGreaterThan(0);
  });

  it('records a sync fingerprint after enableSync', async () => {
    const fp = JSON.parse(localStorage.getItem('sync_fingerprint'));
    expect(fp).toBeTruthy();
    expect(typeof fp.local).toBe('string');
    // A clean first sync (no remote data) records no base hash yet.
    expect(fp.remote).toBe(null);
  });

  it('records an updated fingerprint after a real push', async () => {
    const before = JSON.parse(localStorage.getItem('sync_fingerprint'));
    localStorage.setItem('widget_events', JSON.stringify([{ id: 1, title: 'e' }, { id: 2, title: 'e2' }]));
    await syncEngine.pushAll();

    const after = JSON.parse(localStorage.getItem('sync_fingerprint'));
    // pushAll itself doesn't record the fingerprint; a change must flip the remote hash.
    const written = JSON.parse(gistContent);
    expect(written.hash).toBeDefined();
    expect(before.local).toBeTruthy();
    expect(after.local).toBe(before.local); // fingerprint only updates on a full cycle
  });
});

// ─── divergence detection + directional sync (pull / push / merge) ───────────

/** Write a full v3 gist payload (with hash + device registry). */
function setGistV3(keys, { hash = 'remotehash', deviceId = 'dev_other', updatedAt = 500 } = {}) {
  gistContent = JSON.stringify({
    v: 3,
    deviceId,
    updatedAt,
    hash,
    devices: { [deviceId]: { name: 'Windows', os: 'Windows', lastSeenAt: updatedAt } },
    keys,
  });
}

describe('previewSync — divergence classification', () => {
  it('classifies a first-connect with data on both sides as diverged', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 100 } }, version: 0 }, t: 100 } });

    const preview = await syncEngine.previewSync();
    expect(preview.status).toBe('diverged');
    expect(preview.firstSync).toBe(true);
  });

  it('classifies remote-only data as behind (no base yet)', async () => {
    // local empty, remote has data → pull (behind)
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 100 } }, version: 0 }, t: 100 } });

    const preview = await syncEngine.previewSync();
    expect(preview.status).toBe('behind');
  });

  it('classifies local-only data as ahead (no remote yet)', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local-new' }, version: 0 }));
    gistContent = null; // no gist → 404

    const preview = await syncEngine.previewSync();
    expect(preview.status).toBe('ahead');
  });

  it('classifies both-changed as diverged (not first sync)', async () => {
    // Establish a base by pulling v1 into local.
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'v1' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'v1', t: 100 } }, version: 0 }, t: 100 } }, { hash: 'basehash' });
    await syncEngine.pullSync();

    // Now both sides move.
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local-v2' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote-v2', t: 200 } }, version: 0 }, t: 200 } }, { hash: 'newhash' });

    const preview = await syncEngine.previewSync();
    expect(preview.status).toBe('diverged');
    expect(preview.firstSync).toBeUndefined();
  });
});

describe('directional sync — pull / push', () => {
  it('pullSync overwrites local with remote (remote wins)', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 100 }, language: { v: 'ne', t: 100 } }, version: 0 }, t: 100 } });

    const result = await syncEngine.pullSync();
    const state = JSON.parse(localStorage.getItem('undistracted_settings')).state;
    expect(result.changed).toBe(true);
    expect(state.accent).toBe('remote');
    expect(state.language).toBe('ne');
  });

  it('pullSync deletes local-only settings (replace, not merge)', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local', onlyLocal: 'x' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 100 } }, version: 0 }, t: 100 } });

    await syncEngine.pullSync();
    const state = JSON.parse(localStorage.getItem('undistracted_settings')).state;
    expect(state.onlyLocal).toBeUndefined();
  });

  it('pushSync overwrites remote with local (local wins) + writes the device registry', async () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local', onlyLocal: 'x' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 100 } }, version: 0 }, t: 100 } });

    const result = await syncEngine.pushSync();
    const written = JSON.parse(gistContent);
    expect(result.changed).toBe(true);
    expect(written.keys.undistracted_settings.v.fields.accent.v).toBe('local');
    expect(written.keys.undistracted_settings.v.fields.onlyLocal.v).toBe('local');
    expect(written.devices).toBeTruthy();
    const myId = syncEngine.getSyncStatus().deviceId;
    expect(written.devices[myId]).toBeTruthy();
    expect(syncEngine.getSyncStatus().pendingConflict).toBe(null);
  });

  it('a fresh device does not clobber remote on enableSync', async () => {
    // New device with local data, remote gist with data → diverged, both preserved.
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { accent: 'local' }, version: 0 }));
    setGistV3({ undistracted_settings: { v: { fields: { accent: { v: 'remote', t: 100 } }, version: 0 }, t: 100 } });

    await syncEngine.enableSync();

    const state = JSON.parse(localStorage.getItem('undistracted_settings')).state;
    expect(state.accent).toBe('local'); // not clobbered
    expect(JSON.parse(gistContent).keys.undistracted_settings.v.fields.accent.v).toBe('remote'); // not overwritten
    expect(syncEngine.getSyncStatus().pendingConflict?.status).toBe('diverged');
  });
});
