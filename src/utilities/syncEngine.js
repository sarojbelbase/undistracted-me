/**
 * Cross-device Sync Engine — GitHub gist transport
 *
 * Syncs settings, widget instances, events, and bookmarks across devices via a
 * single private GitHub gist. Last-write-wins with per-key timestamps. The gist
 * holds one JSON file whose shape is:
 *
 *   { v: 1, deviceId, updatedAt, keys: { <localKey>: { v, t } } }
 *
 * Architecture:
 *   - Each syncable local key is stored as { v: <value>, t: <epochMs> } inside
 *     the gist's `keys` map.
 *   - On load (enableSync): read the gist, merge into local (newer wins), then
 *     push local back (local wins where newer).
 *   - Sync is NOT continuous. Auto-sync runs once a day (24h) plus a throttled
 *     pull on focus, and users can trigger a manual "Sync now". A 5-minute
 *     throttle blocks rapid/continuous syncing to stay within GitHub's rate
 *     limits. Changes are accumulated and pushed on the next sync window.
 *   - Writes are serialized through a promise queue to avoid races.
 *
 * What syncs:
 *   - Settings (undistracted_settings)
 *   - Widget instances + per-widget settings (widget_instances)
 *   - Events (widget_events) — native only, GCal events are stripped
 *   - Bookmarks (widget_bookmarks)
 *   - Countdown pinned (countdown_pinned)
 *   - Notes index (notes_index) — note_id → gist metadata; the note *content*
 *     itself is NOT synced here (it lives in per-note private gists managed by
 *     `notesSync.js`).
 *
 * What does NOT sync:
 *   - Notes content (widgetSettings.notes) — stripped from widget_instances and
 *     synced separately via per-note gists.
 *   - Pomodoro history, per-instance pomodoro timers
 *   - Weather cache, Unsplash photos, RSS items, location state, auth tokens,
 *     Spotify tokens, GCal cache, expense data
 */

import { STORAGE_KEYS } from '../constants/storageKeys';
import { isExtension } from './index';
import { GITHUB_GISTS_API } from '../constants/urls';
import {
  getToken,
  getGistId,
  setGistId,
  isConnected,
  gistHeaders,
  GIST_FILENAME,
  GIST_DESCRIPTION,
  GIST_SCHEMA_VERSION,
} from './githubAuth';
import {
  itemKey,
  deepEqual,
  arrayToElementSet,
  mergeElementSets,
  elementSetToArray,
  mapToElementSet,
  elementSetToObject,
} from './syncMerge';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000; // auto-sync once a day
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // block continuous sync — min 5 min between auto-syncs

/** Max entries per array-type key when syncing (oldest trimmed first). */
const MAX_SYNC_ENTRIES = {
  'widget_events': 200,
  'widget_bookmarks': 100,
  'countdown_events': 50,
};

/**
 * syncKey → localStorage key. The sync key names the entry inside the gist's
 * `keys` map; the storage key is where the value lives locally. Fixes the
 * phantom-key bug: bookmarks live in `um_bookmarks`, countdowns in
 * `countdown_events` — not the old `widget_bookmarks`/`countdown_pinned`.
 */
const SYNC_MAP = {
  'undistracted_settings': 'undistracted_settings',
  'widget_instances': 'widget_instances',
  'widget_events': STORAGE_KEYS.EVENTS,
  'widget_bookmarks': STORAGE_KEYS.BOOKMARKS,
  'countdown_events': STORAGE_KEYS.COUNTDOWN_EVENTS,
  'notes_index': STORAGE_KEYS.NOTES_INDEX,
};
const SYNC_KEYS = Object.keys(SYNC_MAP);

/** Array keys merge per-item (element set) instead of whole-value replace. */
const ARRAY_KEYS = new Set(['widget_events', 'widget_bookmarks', 'countdown_events']);

/** localStorage key holding per-key merge metadata (element/field sets). */
const MERGE_META_KEY = 'sync_merge_meta';

// ── State ─────────────────────────────────────────────────────────────────────

let enabled = false;
let deviceId = '';
let lastSyncAt = null;
let lastError = null;
let lastAutoSyncAt = 0;
let lastMergeCount = 0; // number of keys merged from remote on the last pull
let pollTimer = null;
let pollCleanup = null;
let writeQueue = Promise.resolve();
let onChangeCallbacks = new Set(); // external listeners for UI updates
let syncHooks = new Set(); // post-sync hooks (e.g. notesSync.syncNotes)

/** Record the latest sync error and notify listeners (so UI can show guidance). */
const reportError = (message) => {
  lastError = message;
  onChangeCallbacks.forEach((cb) => {
    try { cb('_error', message); } catch { /* ignore */ }
  });
};

/** Clear the last error and notify listeners. */
const clearError = () => {
  if (!lastError) return;
  lastError = null;
  onChangeCallbacks.forEach((cb) => {
    try { cb('_error', null); } catch { /* ignore */ }
  });
};

/** Generate a short random device ID for metadata tracking. */
const generateDeviceId = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return 'dev_' + buf[0].toString(36) + '_' + Date.now().toString(36);
};

/** Get current epoch ms timestamp. */
const now = () => Date.now();

/** Read a value from localStorage safely. */
const readLocal = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/** Write a value to localStorage safely. */
const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

// ── Sync timestamps (separate map, doesn't pollute Zustand state) ─────────────

const TS_KEY = 'sync_timestamps';

/** Get the sync timestamp for a local key. */
const getLocalTs = (localKey) => {
  try {
    const map = JSON.parse(localStorage.getItem(TS_KEY) || '{}');
    return map[localKey] ?? 0;
  } catch {
    return 0;
  }
};

/** Set the sync timestamp for a local key. */
const setLocalTs = (localKey, ts) => {
  try {
    const map = JSON.parse(localStorage.getItem(TS_KEY) || '{}');
    map[localKey] = ts;
    localStorage.setItem(TS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

// ── Local sync schema version (version the local side too) ───────────────────

const SYNC_VERSION_KEY = 'sync_version';

/** Read the local sync schema version (defaults to 0 = never synced). */
const getLocalSyncVersion = () => {
  try {
    const v = parseInt(localStorage.getItem(SYNC_VERSION_KEY) || '0', 10);
    return Number.isFinite(v) ? v : 0;
  } catch {
    return 0;
  }
};

/**
 * Migrate local sync state from an older schema version to the current one.
 * Called once on enableSync when the stored version is behind GIST_SCHEMA_VERSION.
 * Future schema bumps add cases here.
 */
const migrateSync = (fromVersion) => {
  if (fromVersion < 2) {
    // v2 introduced gist discovery + schema versioning. Nothing to rewrite locally:
    // `sync_timestamps` / `sync_device_id` are compatible as-is.
  }
};

/** Persist the current local sync schema version. */
const setLocalSyncVersion = () => {
  try {
    localStorage.setItem(SYNC_VERSION_KEY, String(GIST_SCHEMA_VERSION));
  } catch {
    /* ignore */
  }
};

// ── Gist transport ────────────────────────────────────────────────────────────

/**
 * Read the sync gist and return its parsed payload.
 * Returns null when not connected or unreadable, { notFound: true } on a 404,
 * or { v, keys: {...} } on success.
 */
const readGist = async () => {
  const [token, gistId] = await Promise.all([getToken(), getGistId()]);
  if (!token || !gistId) return null;

  const res = await fetch(`${GITHUB_GISTS_API}/${gistId}`, {
    headers: gistHeaders(token),
  });
  if (res.status === 404) return { notFound: true };
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`GitHub read failed (${res.status}): ${body.message || res.statusText}`);
  }

  const data = await res.json();
  const file = data.files?.[GIST_FILENAME];
  if (!file || !file.content) return { v: GIST_SCHEMA_VERSION, keys: {} };
  try {
    const parsed = JSON.parse(file.content);
    return {
      v: typeof parsed.v === 'number' ? parsed.v : 1,
      keys: parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {},
    };
  } catch {
    return { v: GIST_SCHEMA_VERSION, keys: {} };
  }
};

/**
 * Create-or-update the sync gist with the given `keys` object. Returns the
 * gist id (creating the gist on first write).
 */
const writeGist = async (keys) => {
  const token = await getToken();
  if (!token) throw new Error('Not connected to GitHub');

  const payload = JSON.stringify({ v: GIST_SCHEMA_VERSION, deviceId, updatedAt: now(), keys });
  let gistId = await getGistId();

  if (!gistId) {
    const res = await fetch(GITHUB_GISTS_API, {
      method: 'POST',
      headers: { ...gistHeaders(token), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: GIST_DESCRIPTION,
        public: false,
        files: { [GIST_FILENAME]: { content: payload } },
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Failed to create gist (${res.status}): ${body.message || res.statusText}`);
    }
    const created = await res.json();
    gistId = created.id;
    await setGistId(gistId);
    return gistId;
  }

  const res = await fetch(`${GITHUB_GISTS_API}/${gistId}`, {
    method: 'PATCH',
    headers: { ...gistHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      files: { [GIST_FILENAME]: { content: payload } },
    }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to update gist (${res.status}): ${body.message || res.statusText}`);
  }
  return gistId;
};

// ── Event dispatch for hooks ──────────────────────────────────────────────────

/**
 * Dispatch a window event so hooks (useEvents, etc.) pick up changes
 * that were written to localStorage by the sync engine.
 */
const notifyHooks = (localKey) => {
  if (localKey === STORAGE_KEYS.EVENTS) {
    try {
      globalThis.dispatchEvent(new Event('widget_events_changed'));
    } catch {
      /* ignore */
    }
  }
  // For other keys, hooks subscribe via Zustand — no custom event needed.
};

// ── Merge metadata (per-key last-synced element/field sets) ──────────────────

/** Read the last-synced merge metadata for a key (or null when absent). */
const readMeta = (localKey) => {
  try {
    const map = JSON.parse(localStorage.getItem(MERGE_META_KEY) || '{}');
    const meta = map[localKey];
    return meta && typeof meta === 'object' ? meta : null;
  } catch {
    return null;
  }
};

/** Persist the last-synced merge metadata for a key. */
const writeMeta = (localKey, meta) => {
  try {
    const map = JSON.parse(localStorage.getItem(MERGE_META_KEY) || '{}');
    map[localKey] = meta;
    localStorage.setItem(MERGE_META_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

/**
 * Normalize an on-wire array value into an element set. Handles the legacy
 * array format (all items share the outer timestamp) and the new
 * `{ items, deleted }` format.
 */
const normalizeElementSet = (v, outerT) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('items' in v || 'deleted' in v)) {
    return { items: v.items || {}, deleted: v.deleted || {} };
  }
  if (Array.isArray(v)) {
    const items = {};
    for (const item of v) {
      const id = itemKey(item);
      if (id) items[id] = { v: item, t: outerT || 0 };
    }
    return { items, deleted: {} };
  }
  return { items: {}, deleted: {} };
};

/** Trim an element set to the newest `maxEntries` items. */
const trimElementSet = (set, maxEntries) => {
  if (!maxEntries) return set;
  const items = set.items || {};
  const ids = Object.keys(items);
  if (ids.length <= maxEntries) return set;
  ids.sort((a, b) => (items[b].t ?? 0) - (items[a].t ?? 0));
  const keep = new Set(ids.slice(0, maxEntries));
  const trimmed = {};
  for (const id of ids) if (keep.has(id)) trimmed[id] = items[id];
  return { items: trimmed, deleted: set.deleted || {} };
};

/**
 * Strip Google Calendar events from an events array.
 * GCal events have a `calendarId` field or `source === 'gcal'` — they're
 * auto-populated on sign-in, so syncing them is redundant.
 */
const stripGcalEvents = (events) => {
  if (!Array.isArray(events)) return events;
  return events.filter(
    (e) => !e?.calendarId && e?.source !== 'gcal' && !e?.gcalEventId,
  );
};

/** Apply per-key preprocessing to a local array before merging. */
const preprocessArray = (localKey, array) => {
  if (localKey === 'widget_events') return stripGcalEvents(array);
  return array;
};

/**
 * Merge a remote element set into the local array for an array key. Diffing the
 * local array against the last-synced metadata captures un-synced local edits
 * and deletions, then the union+LWW merge reconciles them with the remote side.
 *
 * Returns { set, array, changed } where `set` is the merged element set, `array`
 * the rebuilt local array, and `changed` whether the local array changed.
 */
const mergeArrayKey = (localKey, remoteSet) => {
  const storageKey = SYNC_MAP[localKey];
  const localArray = preprocessArray(localKey, readLocal(storageKey) || []);
  const localMeta = readMeta(localKey) || { items: {}, deleted: {} };
  const localSet = arrayToElementSet(localArray, localMeta, now());
  const merged = mergeElementSets(localSet, remoteSet);
  const trimmed = trimElementSet(merged, MAX_SYNC_ENTRIES[localKey]);
  const next = elementSetToArray(trimmed, localArray);

  const changed = !deepEqual(next, localArray);

  // Always persist the merged metadata (timestamps + tombstones) — even when the
  // array content is unchanged, so the next sync doesn't re-stamp every item.
  writeMeta(localKey, trimmed);
  if (changed) {
    writeLocal(storageKey, next);
  }
  return { set: trimmed, array: next, changed };
};

/**
 * Normalize a settings wire value into `{ fields, version }`. Handles the new
 * `{ fields, version }` format and the legacy `{ state, version }` format.
 */
const normalizeSettings = (v, outerT) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'fields' in v) {
    return { fields: v.fields || {}, version: v.version };
  }
  if (v && typeof v === 'object' && v.state && typeof v.state === 'object') {
    const fields = {};
    for (const [k, val] of Object.entries(v.state)) {
      fields[k] = { v: val, t: outerT || 0 };
    }
    return { fields, version: v.version };
  }
  return { fields: {}, version: undefined };
};

/**
 * Merge the settings object (field-level LWW). Settings fields are independent;
 * concurrent edits to different fields union instead of clobbering.
 * Returns { wire, changed }.
 */
const mergeSettingsKey = (localKey, remoteWire) => {
  const storageKey = SYNC_MAP[localKey];
  const raw = readLocal(storageKey);
  const localState = raw && typeof raw === 'object' && raw.state && typeof raw.state === 'object' ? raw.state : {};
  const version = raw && typeof raw === 'object' ? raw.version : undefined;

  const meta = readMeta(localKey) || { fields: { items: {}, deleted: {} } };
  const localSet = mapToElementSet(localState, meta.fields, now());
  const remoteSet = { items: remoteWire?.fields || {}, deleted: {} };
  const merged = mergeElementSets(localSet, remoteSet);
  const newState = elementSetToObject(merged);

  const changed = !deepEqual(newState, localState);
  writeMeta(localKey, { fields: merged });
  if (changed) {
    const nextRaw = { state: newState };
    if (version !== undefined) nextRaw.version = version;
    writeLocal(storageKey, nextRaw);
  }

  return { wire: { fields: merged.items, version: version ?? 0 }, changed };
};

/**
 * Normalize a widget_instances wire value into
 * `{ instances, widgetSettings, version }` element sets. Handles legacy
 * `{ state: { instances, widgetSettings }, version }`.
 */
const normalizeWidgetInstances = (v, outerT) => {
  if (v && typeof v === 'object' && !Array.isArray(v) && ('instances' in v || 'widgetSettings' in v)) {
    return {
      instances: normalizeElementSet(v.instances, outerT),
      widgetSettings: normalizeElementSet(v.widgetSettings, outerT),
      version: v.version,
    };
  }
  if (v && typeof v === 'object' && v.state && typeof v.state === 'object') {
    const instances = { items: {}, deleted: {} };
    for (const inst of v.state.instances || []) {
      const id = itemKey(inst);
      if (id) instances.items[id] = { v: inst, t: outerT || 0 };
    }
    const ws = { ...(v.state.widgetSettings || {}) };
    delete ws.notes; // notes synced via per-note gists
    const widgetSettings = { items: {}, deleted: {} };
    for (const [id, s] of Object.entries(ws)) {
      widgetSettings.items[id] = { v: s, t: outerT || 0 };
    }
    return { instances, widgetSettings, version: v.version };
  }
  return {
    instances: { items: {}, deleted: {} },
    widgetSettings: { items: {}, deleted: {} },
    version: undefined,
  };
};

/**
 * Merge widget_instances (per-instance + per-widget-setting LWW). The notes
 * widget's settings are excluded — notes sync via per-note gists — and the local
 * notes settings are preserved on rebuild.
 * Returns { wire, changed }.
 */
const mergeWidgetInstancesKey = (localKey, remoteWire) => {
  const storageKey = SYNC_MAP[localKey];
  const raw = readLocal(storageKey);
  const localState = raw && typeof raw === 'object' && raw.state ? raw.state : {};
  const version = raw && typeof raw === 'object' ? raw.version : undefined;

  const localInstances = Array.isArray(localState.instances) ? localState.instances : [];
  const localWidgetSettings =
    localState.widgetSettings && typeof localState.widgetSettings === 'object'
      ? localState.widgetSettings
      : {};

  // Exclude the notes widget's settings from the synced map.
  const localWsNoNotes = { ...localWidgetSettings };
  delete localWsNoNotes.notes;

  const meta = readMeta(localKey) || {
    instances: { items: {}, deleted: {} },
    widgetSettings: { items: {}, deleted: {} },
  };

  const localInstSet = arrayToElementSet(localInstances, meta.instances, now());
  const localWsSet = mapToElementSet(localWsNoNotes, meta.widgetSettings, now());

  const mergedInstances = mergeElementSets(localInstSet, remoteWire?.instances || { items: {}, deleted: {} });
  const mergedWidgetSettings = mergeElementSets(localWsSet, remoteWire?.widgetSettings || { items: {}, deleted: {} });

  const newInstances = elementSetToArray(mergedInstances, localInstances);
  const newWs = elementSetToObject(mergedWidgetSettings);
  // Re-inject the local notes widget settings (preserved, never synced here).
  if (localWidgetSettings.notes) newWs.notes = localWidgetSettings.notes;

  const changed =
    !deepEqual(newInstances, localInstances) || !deepEqual(newWs, localWidgetSettings);

  writeMeta(localKey, { instances: mergedInstances, widgetSettings: mergedWidgetSettings });
  if (changed) {
    const nextRaw = { state: { instances: newInstances, widgetSettings: newWs } };
    if (version !== undefined) nextRaw.version = version;
    writeLocal(storageKey, nextRaw);
  }

  return {
    wire: {
      instances: mergedInstances,
      widgetSettings: mergedWidgetSettings,
      version: version ?? 0,
    },
    changed,
  };
};

// ── Pull: merge remote → local ────────────────────────────────────────────────

/**
 * Pull all syncable data from the gist and merge into localStorage using
 * last-write-wins (higher timestamp wins).
 *
 * Returns an object describing what changed: { settings, widgetInstances, ... }
 * Each entry is true if remote was newer, false if local was kept.
 */
const pullFromSync = async () => {
  if (!enabled) return {};

  let remote;
  try {
    remote = await readGist();
  } catch (err) {
    console.error('[sync] pull failed:', err.message);
    reportError(err.message);
    return {};
  }
  if (!remote || remote.notFound) return {};

  // If the remote was written by a newer app version we don't understand, don't
  // blindly parse/overwrite it (that risks corrupting the shared state).
  if (typeof remote.v === 'number' && remote.v > GIST_SCHEMA_VERSION) {
    console.error('[sync] remote gist uses a newer schema (v' + remote.v + ') — skipping pull');
    reportError('Sync data was written by a newer version of the app. Please update the app.');
    return {};
  }

  clearError();

  const changes = {};
  for (const localKey of SYNC_KEYS) {
    const entry = remote.keys?.[localKey];
    if (!entry || typeof entry.t !== 'number') continue;

    // Each merge is idempotent and self-detects whether anything changed, so
    // there is no whole-key timestamp gate (which could skip a merge on clock
    // skew). Last-write-wins happens per-item / per-field.
    let changed = false;
    if (ARRAY_KEYS.has(localKey)) {
      changed = mergeArrayKey(localKey, normalizeElementSet(entry.v, entry.t)).changed;
    } else if (localKey === 'undistracted_settings') {
      changed = mergeSettingsKey(localKey, normalizeSettings(entry.v, entry.t)).changed;
    } else if (localKey === 'widget_instances') {
      changed = mergeWidgetInstancesKey(localKey, normalizeWidgetInstances(entry.v, entry.t)).changed;
    } else if (localKey === 'notes_index') {
      const storageKey = SYNC_MAP[localKey];
      const merged = mergeNotesIndex(readLocal(storageKey), entry.v);
      if (!deepEqual(merged, readLocal(storageKey))) {
        writeLocal(storageKey, merged);
        changed = true;
      }
    }

    if (changed) {
      setLocalTs(localKey, entry.t);
      notifyHooks(localKey);
      changes[localKey] = true;
    }
  }

  if (Object.keys(changes).length > 0) {
    lastSyncAt = now();
    lastMergeCount = Object.keys(changes).length;
  }
  return changes;
};

// ── Push: merge local → remote ────────────────────────────────────────────────

/**
 * Merge two notes-index maps (note_id → { gistId, label, updatedAt }) keeping
 * the union of ids and, on conflict, the entry with the higher `updatedAt`.
 */
const mergeNotesIndex = (localIndex, remoteIndex) => {
  const merged = {};
  const a = localIndex && typeof localIndex === 'object' ? localIndex : {};
  const b = remoteIndex && typeof remoteIndex === 'object' ? remoteIndex : {};
  for (const [id, entry] of Object.entries(b)) merged[id] = entry;
  for (const [id, entry] of Object.entries(a)) {
    const r = b[id];
    if (!r || (entry && typeof entry.updatedAt === 'number' && entry.updatedAt > r.updatedAt)) {
      merged[id] = entry;
    }
  }
  return merged;
};

/**
 * Push a single key from localStorage to the gist. Does nothing if sync is
 * disabled or if the value is unchanged. Writes are serialized through the
 * shared write queue. Resolves to { changed: boolean }.
 *
 * Only `notes_index` takes the targeted single-key path; every other key merges
 * through pushAll (element/field sets).
 */
const pushKey = (localKey) => {
  if (!enabled) return Promise.resolve({ changed: false });
  if (!SYNC_MAP[localKey]) return Promise.resolve({ changed: false });

  if (localKey !== 'notes_index') return pushAll();

  const storageKey = SYNC_MAP[localKey];
  const local = readLocal(storageKey);
  if (local === null || local === undefined) return Promise.resolve({ changed: false });

  const ts = now();

  writeQueue = writeQueue
    .then(async () => {
      let remote;
      try {
        remote = await readGist();
      } catch {
        remote = { keys: {} };
      }

      const keys = { ...(remote?.keys || {}) };
      // Union with the remote index so we never drop another device's entries.
      const merged = mergeNotesIndex(local, keys[localKey]?.v);
      if (keys[localKey] && deepEqual(keys[localKey].v, merged)) {
        return { changed: false };
      }

      keys[localKey] = { v: merged, t: ts };
      await writeGist(keys);
      setLocalTs(localKey, ts);
      lastSyncAt = ts;
      clearError();
      return { changed: true };
    })
    .catch((err) => {
      console.error('[sync] push failed:', err.message);
      reportError(err.message);
      return { changed: false, error: err.message };
    });

  return writeQueue;
};

/**
 * Cross-device sync is intentionally not continuous. Changes to settings,
 * widgets, events, etc. are pushed on the next automatic (daily) sync or a
 * manual "Sync now" — never immediately on every edit. Kept as a no-op for API
 * compatibility with the stores that call it.
 */
const schedulePush = () => {};

/**
 * Push all syncable keys immediately (used on first enable). Skips unchanged
 * keys and skips the gist write entirely when nothing changed.
 * Resolves to { changed: boolean }.
 */
const pushAll = async () => {
  if (!enabled) return { changed: false };

  writeQueue = writeQueue
    .then(async () => {
      let remote;
      try {
        remote = await readGist();
      } catch {
        remote = { keys: {} };
      }

      const keys = { ...(remote?.keys || {}) };
      let changed = false;
      for (const localKey of SYNC_KEYS) {
        const storageKey = SYNC_MAP[localKey];

        // Array keys — element-set merge; write only if the merged set differs.
        if (ARRAY_KEYS.has(localKey)) {
          const remoteEntry = keys[localKey];
          const remoteSet = normalizeElementSet(remoteEntry?.v, remoteEntry?.t);
          const { set } = mergeArrayKey(localKey, remoteSet);
          if (!deepEqual(set, remoteSet)) {
            const ts = now();
            keys[localKey] = { v: set, t: ts };
            setLocalTs(localKey, ts);
            changed = true;
          }
          continue;
        }

        // Settings — field-level merge.
        if (localKey === 'undistracted_settings') {
          const remoteEntry = keys[localKey];
          const remoteWire = normalizeSettings(remoteEntry?.v, remoteEntry?.t);
          const { wire } = mergeSettingsKey(localKey, remoteWire);
          if (!deepEqual(wire, remoteWire)) {
            const ts = now();
            keys[localKey] = { v: wire, t: ts };
            setLocalTs(localKey, ts);
            changed = true;
          }
          continue;
        }

        // Widget instances — per-instance + per-widget-setting merge.
        if (localKey === 'widget_instances') {
          const remoteEntry = keys[localKey];
          const remoteWire = normalizeWidgetInstances(remoteEntry?.v, remoteEntry?.t);
          const { wire } = mergeWidgetInstancesKey(localKey, remoteWire);
          if (!deepEqual(wire, remoteWire)) {
            const ts = now();
            keys[localKey] = { v: wire, t: ts };
            setLocalTs(localKey, ts);
            changed = true;
          }
          continue;
        }

        // Notes index — union merge (local wins where newer).
        const local = readLocal(storageKey);
        if (local === null || local === undefined) continue;
        const mergedIndex = mergeNotesIndex(local, keys[localKey]?.v);
        if (keys[localKey] && deepEqual(keys[localKey].v, mergedIndex)) continue;

        const ts = now();
        keys[localKey] = { v: mergedIndex, t: ts };
        setLocalTs(localKey, ts);
        changed = true;
      }

      if (!changed) return { changed: false };

      await writeGist(keys);
      lastSyncAt = now();
      clearError();
      return { changed: true };
    })
    .catch((err) => {
      console.error('[sync] pushAll failed:', err.message);
      reportError(err.message);
      return { changed: false, error: err.message };
    });

  return writeQueue;
};

// ── Polling (daily auto-sync, throttled to block continuous syncing) ──────────

/** True when enough time has passed since the last automatic sync. */
const canAutoSync = () => (now() - lastAutoSyncAt) >= SYNC_THROTTLE_MS;

/** Run one automatic sync cycle (pull remote, then push local, then hooks). */
const runAutoSync = async () => {
  lastAutoSyncAt = now();
  await pullFromSync();
  const pushed = await pushAll();
  await runSyncHooks();
  if (pushed.changed) lastSyncAt = now();
};

const setupPolling = () => {
  if (pollTimer || !isExtension()) return;

  // Daily auto-sync. The 5-minute throttle additionally blocks "continuous"
  // syncing (rapid focus events, multiple tabs) to respect GitHub rate limits.
  pollTimer = setInterval(() => {
    if (enabled && canAutoSync()) runAutoSync();
  }, DAILY_INTERVAL_MS);

  const onVis = () => {
    if (enabled && document.visibilityState === 'visible' && canAutoSync()) {
      runAutoSync();
    }
  };
  document.addEventListener('visibilitychange', onVis);
  window.addEventListener('focus', onVis);

  pollCleanup = () => {
    document.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('focus', onVis);
  };
};

const teardownPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (pollCleanup) {
    pollCleanup();
    pollCleanup = null;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enable cross-device sync (requires a GitHub connection).
 * - Pulls the gist and merges with local (last-write-wins).
 * - Pushes all local data to the gist (creates it on first connect).
 * - Starts daily auto-sync (throttled to block continuous syncing).
 */
const enableSync = async () => {
  if (!isExtension()) {
    console.log('[sync] Not available — not running as extension');
    return;
  }
  const token = await getToken();
  if (!token) {
    console.log('[sync] Enable skipped — no GitHub token');
    return;
  }

  enabled = true;
  writeLocal('sync_enabled', true);

  // Version the local sync state and run any pending migration.
  migrateSync(getLocalSyncVersion());
  setLocalSyncVersion();

  deviceId = readLocal('sync_device_id') || generateDeviceId();
  writeLocal('sync_device_id', deviceId);

  const changes = await pullFromSync();
  await pushAll();
  setupPolling();

  if (Object.keys(changes).length > 0) {
    onChangeCallbacks.forEach((cb) => {
      try {
        cb('_initial_pull', changes);
      } catch {
        /* ignore */
      }
    });
  }

  lastAutoSyncAt = now(); // start the 5-min throttle from connect
  lastSyncAt = now();
  console.log('[sync] Enabled — device:', deviceId);
};

/**
 * Disable cross-device sync — stops polling and clears pending push timers.
 * Does NOT delete the gist (user may reconnect later).
 */
const disableSync = () => {
  enabled = false;
  writeLocal('sync_enabled', false);

  teardownPolling();
  console.log('[sync] Disabled');
};

/** Check if sync is currently enabled. */
const isSyncEnabled = () => enabled;

/**
 * Get sync status info for UI display.
 * Returns { available, enabled, connected, lastSyncAt, deviceId, lastError }.
 */
const getSyncStatus = () => ({
  available: isExtension(),
  enabled,
  connected: isConnected(),
  lastSyncAt,
  lastMergeCount,
  deviceId,
  lastError,
});

/**
 * Subscribe to sync change events (e.g., for UI status badge updates).
 * Returns an unsubscribe function.
 */
const onSyncChange = (callback) => {
  onChangeCallbacks.add(callback);
  return () => onChangeCallbacks.delete(callback);
};

/**
 * Register a post-sync hook that runs after each full sync cycle (auto or
 * manual). Used by notesSync to reconcile per-note gists with the config index.
 * Returns an unsubscribe function.
 */
const registerSyncHook = (fn) => {
  syncHooks.add(fn);
  return () => syncHooks.delete(fn);
};

/** Run all registered post-sync hooks (awaiting each in turn). */
const runSyncHooks = async () => {
  let changed = false;
  for (const fn of syncHooks) {
    try {
      const result = await fn();
      if (result && result.changed) changed = true;
    } catch (err) {
      console.error('[sync] hook failed:', err.message);
    }
  }
  return { changed };
};

/**
 * Force a full sync cycle: pull remote, push local, then notify listeners.
 * Throttled — a sync that completed within the last 5 minutes is skipped so the
 * user can't trigger repetitive syncs. Resolves to:
 *   { changed, reason: 'synced' | 'no-changes' | 'recently-synced' | 'disabled' }
 */
const forceSync = async () => {
  if (!isExtension() || !enabled) {
    return { changed: false, reason: 'disabled' };
  }

  // Once a sync succeeds, hold for 5 minutes before allowing another.
  if (lastSyncAt && now() - lastSyncAt < SYNC_THROTTLE_MS) {
    onChangeCallbacks.forEach((cb) => {
      try {
        cb('_force', null);
      } catch {
        /* ignore */
      }
    });
    return { changed: false, reason: 'recently-synced' };
  }

  const pulled = await pullFromSync();
  const pushed = await pushAll();
  const hooks = await runSyncHooks();
  lastAutoSyncAt = now(); // manual sync resets the throttle clock

  const pullCount = Object.keys(pulled).length;
  const changed = pullCount > 0 || !!pushed.changed || !!hooks.changed;
  if (changed) lastSyncAt = now();

  onChangeCallbacks.forEach((cb) => {
    try {
      cb('_force', null);
    } catch {
      /* ignore */
    }
  });

  return { changed, pullCount, reason: changed ? 'synced' : 'no-changes' };
};

/**
 * Initialize sync on app load. Re-enables silently if the user had sync on and
 * is still connected to GitHub.
 */
const initSync = async () => {
  if (!isExtension()) return;

  let wasEnabled = false;
  try {
    wasEnabled = localStorage.getItem('sync_enabled') === 'true';
  } catch {
    /* ignore */
  }

  if (wasEnabled && isConnected()) {
    await enableSync();
  } else if (wasEnabled && !isConnected()) {
    // Token was cleared elsewhere — reset the flag so we stop trying.
    writeLocal('sync_enabled', false);
  }
};

// ── Export ────────────────────────────────────────────────────────────────────

const syncEngine = {
  enableSync,
  disableSync,
  isSyncEnabled,
  getSyncStatus,
  schedulePush,
  pushKey,
  pullFromSync,
  pushAll,
  forceSync,
  initSync,
  onSyncChange,
  registerSyncHook,
  SYNC_MAP, // exposed so stores know which keys to watch
};

export default syncEngine;
