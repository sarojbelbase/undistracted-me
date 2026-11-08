/**
 * Cross-device Sync Engine — transport-agnostic (Google Drive backend)
 *
 * Syncs settings, widget instances, events, and bookmarks across devices via a
 * single config file in the transport (Google Drive appDataFolder). Last-write-wins
 * with per-key timestamps. The config file holds one JSON payload whose shape is:
 *
 *   { v: 1, deviceId, updatedAt, keys: { <localKey>: { v, t } } }
 *
 * Architecture:
 *   - Each syncable local key is stored as { v: <value>, t: <epochMs> } inside
 *     the config's `keys` map.
 *   - On load (enableSync): read the config, merge into local (newer wins), then
 *     push local back (local wins where newer).
 *   - Sync is NOT continuous. Auto-sync runs once a day (24h) plus a throttled
 *     pull on focus, and users can trigger a manual "Sync now". A 5-minute
 *     throttle blocks rapid/continuous syncing. Changes are accumulated and
 *     pushed on the next sync window.
 *   - Writes are serialized through a promise queue to avoid races.
 *   - The transport is injected via `syncTransport` (dependency-injection seam) —
 *     this engine never talks to a concrete service directly.
 *
 * What syncs:
 *   - Settings (undistracted_settings)
 *   - Widget instances + per-widget settings (widget_instances)
 *   - Events (widget_events) — native only, GCal events are stripped
 *   - Bookmarks (widget_bookmarks)
 *   - Countdown pinned (countdown_pinned)
 *   - Focus Mode background (focus_mode) — source, custom URL, orb palette,
 *     selected photo (aggregated from the `fm_*` keys)
 *   - Notes index (notes_index) — note_id → file metadata; the note *content*
 *     itself is NOT synced here (it lives in per-note files managed by
 *     `notesSync.js`).
 *
 * What does NOT sync:
 *   - Notes content (widgetSettings.notes) — stripped from widget_instances and
 *     synced separately via per-note files.
 *   - Pomodoro history, per-instance pomodoro timers
 *   - Weather cache, Unsplash photos, RSS items, location state, auth tokens,
 *     Spotify tokens, GCal cache, expense data
 */

import { STORAGE_KEYS } from '../constants/storageKeys';
import { isExtension } from './index';
import { syncTransport, SYNC_SCHEMA_VERSION } from './syncTransport';
import {
  itemKey,
  deepEqual,
  arrayToElementSet,
  mergeElementSets,
  elementSetToArray,
  mapToElementSet,
  elementSetToObject,
} from './syncMerge';
import { readFocusModeState, writeFocusModeState } from './focusModeState';

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
  'focus_mode': 'focus_mode',
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
let lastRemoteHash = null; // content hash of the last gist payload read/written
let pendingConflict = null; // divergence preview awaiting a user pull/push/merge choice
let pollTimer = null;
let pollCleanup = null;
let writeQueue = Promise.resolve();
let onChangeCallbacks = new Set(); // external listeners for UI updates
let syncHooks = new Set(); // post-sync hooks (e.g. notesSync.syncNotes)
let refreshListeners = new Set(); // downstream state-store rehydrators

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

// ── Device identity (registry) ────────────────────────────────────────────────
//
// Each device persists a stable id + friendly name/os. The gist's `devices` map
// keys on the id so multiple devices can coexist without one clobbering the
// other's identity. `lastSeenAt` is the last time that device pushed.

const DEVICE_INFO_KEY = 'sync_device_info';

/** Detect a friendly OS label for the device registry. */
const detectDeviceInfo = () => {
  try {
    const ua = navigator.userAgent || '';
    const plat = navigator.userAgentData?.platform || navigator.platform || '';
    const s = `${plat} ${ua}`;
    if (/Windows|Win32|Win64/i.test(s)) return { os: 'Windows', name: 'Windows' };
    if (/Mac|Macintosh/i.test(s)) return { os: 'macOS', name: 'Mac' };
    if (/Android/i.test(s)) return { os: 'Android', name: 'Android' };
    if (/iPhone|iPad|iOS/i.test(s)) return { os: 'iOS', name: 'iOS' };
    if (/Linux/i.test(s)) return { os: 'Linux', name: 'Linux' };
  } catch {
    /* ignore */
  }
  return { os: 'Unknown', name: 'This device' };
};

/** Get (and cache) this device's registry metadata. */
const getDeviceInfo = () => {
  try {
    const cached = JSON.parse(localStorage.getItem(DEVICE_INFO_KEY) || 'null');
    if (cached && typeof cached === 'object' && cached.os) return cached;
  } catch {
    /* ignore */
  }
  const info = detectDeviceInfo();
  try {
    localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(info));
  } catch {
    /* ignore */
  }
  return info;
};

/** Build this device's registry entry (stamped now). */
const myDeviceEntry = () => {
  const { name, os } = getDeviceInfo();
  return { name, os, lastSeenAt: now() };
};

/** Merge this device's entry into a remote registry (preserving other devices). */
const mergedDevices = (remote) => ({
  ...(remote?.devices || {}),
  [deviceId]: myDeviceEntry(),
});

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
 * Called once on enableSync when the stored version is behind SYNC_SCHEMA_VERSION.
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
    localStorage.setItem(SYNC_VERSION_KEY, String(SYNC_SCHEMA_VERSION));
  } catch {
    /* ignore */
  }
};

// ── Content hash (change detection) ───────────────────────────────────────────

/**
 * Stable stringify with sorted object keys. Produces a deterministic string for
 * any JSON value regardless of key insertion order, so the same logical config
 * hashes identically across devices and runs.
 */
const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return '[' + value.map(stableStringify).join(',') + ']';
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
};

/** djb2 hash → 8-char hex. Fast + deterministic; for change detection only. */
const hashString = (str) => {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
};

/** Content hash of an arbitrary JSON value (sorted-key canonical). */
const hashValue = (value) => hashString(stableStringify(value));

/** localStorage key holding the last-synced fingerprint { local, remote }. */
const FINGERPRINT_KEY = 'sync_fingerprint';

const readFingerprint = () => {
  try {
    const f = JSON.parse(localStorage.getItem(FINGERPRINT_KEY) || '{}');
    return { local: f.local ?? null, remote: f.remote ?? null };
  } catch {
    return { local: null, remote: null };
  }
};

const writeFingerprint = (local, remote) => {
  try {
    localStorage.setItem(FINGERPRINT_KEY, JSON.stringify({ local, remote }));
  } catch {
    /* ignore */
  }
};

/**
 * Read a syncable value for a local key. Most keys read straight from their
 * storage key; `focus_mode` is a virtual key that aggregates the individual
 * `fm_*` localStorage keys (see focusModeState.js).
 */
const readLocalForKey = (localKey) => {
  if (localKey === 'focus_mode') return readFocusModeState();
  return readLocal(SYNC_MAP[localKey]);
};

/**
 * Content hash of the *local* syncable state (all sync keys, raw values). This
 * is only compared against itself over time — it detects "did anything change
 * locally since the last sync" without needing the wire format.
 */
const hashLocalState = () => {
  const parts = [];
  for (const localKey of SYNC_KEYS) {
    const raw = readLocalForKey(localKey);
    parts.push(localKey + ':' + (raw === null || raw === undefined ? '∅' : hashValue(raw)));
  }
  return hashString(parts.join('|'));
};

/** Snapshot the local + remote content hashes after a completed sync cycle. */
const recordFingerprint = () => {
  writeFingerprint(hashLocalState(), lastRemoteHash);
};

/**
 * True when neither the local state nor the remote gist has changed since the
 * last sync — i.e. there is nothing to pull or push. Both hashes must be known
 * (non-null); a null remote hash (gist missing/corrupt) forces a real sync.
 */
const isSyncClean = () => {
  if (lastRemoteHash == null) return false;
  const fp = readFingerprint();
  if (fp.remote == null || fp.remote !== lastRemoteHash) return false;
  return hashLocalState() === fp.local;
};

// ── Gist transport ────────────────────────────────────────────────────────────

/**
 * Read the remote config payload via the transport.
 * Returns null when not connected or unreadable, { notFound: true } when no
 * remote file exists, or { v, keys, hash, deviceId, updatedAt, devices } on success.
 */
const readRemote = async () => {
  const remote = await syncTransport.readConfig();
  if (remote == null) {
    lastRemoteHash = null;
    return null;
  }
  if (remote.notFound) {
    lastRemoteHash = null;
    return { notFound: true };
  }
  const parsed = remote || {};
  const hash = typeof parsed.hash === 'string' ? parsed.hash : null;
  lastRemoteHash = hash;
  return {
    v: typeof parsed.v === 'number' ? parsed.v : 1,
    keys: parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {},
    hash,
    deviceId: typeof parsed.deviceId === 'string' ? parsed.deviceId : null,
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : null,
    devices: parsed.devices && typeof parsed.devices === 'object' ? parsed.devices : {},
  };
};

/**
 * Create-or-update the remote config with the given `keys` object.
 *
 * @param {object} keys    the sync keys payload
 * @param {object} [devices] the device registry (defaults to just this device)
 */
const writeRemote = async (keys, devices) => {
  if (!syncTransport.isConnected()) throw new Error('Not connected to Google Drive');

  const hash = hashValue(keys);
  const registry = devices && typeof devices === 'object'
    ? devices
    : { [deviceId]: myDeviceEntry() };
  const payload = {
    v: SYNC_SCHEMA_VERSION,
    deviceId,
    updatedAt: now(),
    hash,
    devices: registry,
    keys,
  };
  await syncTransport.writeConfig(payload);
  lastRemoteHash = hash;
};

// ── Event dispatch for hooks ──────────────────────────────────────────────────

/**
 * Dispatch a window event so hooks (useEvents, sharedBookmarks, the countdown
 * widget, FocusMode) pick up changes that were written to localStorage by the
 * sync engine. The event name is keyed by the *sync* key, not the storage key.
 */
const SYNC_HOOK_EVENTS = {
  'widget_events': 'widget_events_changed',
  'widget_bookmarks': 'um_bookmarks_changed',
  'countdown_events': 'countdown_events_changed',
  'focus_mode': 'focus_mode_changed',
};

const notifyHooks = (localKey) => {
  const event = SYNC_HOOK_EVENTS[localKey];
  if (!event) return;
  try {
    globalThis.dispatchEvent(new Event(event));
  } catch {
    /* ignore */
  }
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

  // Notes content must NEVER ride inside the config gist — it syncs through
  // per-note private gists (notesSync.js). The local side is stripped above, but
  // a stale `notes` entry from a previously-polluted gist would survive the
  // union. Drop it unconditionally: the wire/remoteWire diff in pushAll then
  // detects the difference and writes a cleaned gist. No tombstone is needed —
  // every device strips `notes` locally, so it can never be re-added via merge.
  delete mergedWidgetSettings.items.notes;

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

/**
 * Merge focus_mode (the Focus Mode background: source, custom URL, orb palette,
 * selected photo). Field-level LWW — the same independent-field union used by
 * settings — so a wallpaper change on one device never clobbers an unrelated
 * background field changed concurrently on another. The local side reads from
 * and writes to the individual `fm_*` keys via focusModeState.js.
 * Returns { wire, changed }.
 */
const mergeFocusModeKey = (localKey, remoteWire) => {
  const localState = readFocusModeState();
  const meta = readMeta(localKey) || { fields: { items: {}, deleted: {} } };
  const localSet = mapToElementSet(localState, meta.fields, now());
  const remoteSet = { items: remoteWire?.fields || {}, deleted: {} };
  const merged = mergeElementSets(localSet, remoteSet);
  const newState = elementSetToObject(merged);

  const changed = !deepEqual(newState, localState);
  writeMeta(localKey, { fields: merged });
  if (changed) {
    writeFocusModeState(newState);
  }
  return { wire: { fields: merged.items, version: remoteWire?.version ?? 0 }, changed };
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
    remote = await readRemote();
  } catch (err) {
    console.error('[sync] pull failed:', err.message);
    reportError(err.message);
    lastRemoteHash = null; // don't trust a stale hash to skip the push
    return {};
  }
  if (!remote || remote.notFound) {
    if (!remote) lastRemoteHash = null;
    return {};
  }

  // If the remote was written by a newer app version we don't understand, don't
  // blindly parse/overwrite it (that risks corrupting the shared state).
  if (typeof remote.v === 'number' && remote.v > SYNC_SCHEMA_VERSION) {
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
    } else if (localKey === 'focus_mode') {
      changed = mergeFocusModeKey(localKey, normalizeSettings(entry.v, entry.t)).changed;
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
    // Rehydrate downstream stores (settings, widget instances) and any other
    // registered listeners so the UI reflects the merged local state.
    refreshListeners.forEach((fn) => {
      try { fn(changes); } catch { /* ignore */ }
    });
  }
  return changes;
};

// ── Push: merge local → remote ────────────────────────────────────────────────

/**
 * Merge two notes-index maps (note_id → { fileId, label, updatedAt }) keeping
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
        remote = await readRemote();
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
      await writeRemote(keys, mergedDevices(remote));
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
        remote = await readRemote();
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

        // Focus mode background — field-level merge.
        if (localKey === 'focus_mode') {
          const remoteEntry = keys[localKey];
          const remoteWire = normalizeSettings(remoteEntry?.v, remoteEntry?.t);
          const { wire } = mergeFocusModeKey(localKey, remoteWire);
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

      await writeRemote(keys, mergedDevices(remote));
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

// ── Divergence detection + directional sync (pull / push / merge) ────────────
//
// The clobber bug: a device that has never synced (no base hash recorded) used
// to stamp every local field/item with `now()` and push it, beating the other
// device's older timestamps. We now classify the relationship like git
// (clean / ahead / behind / diverged) against the last-synced base hash, and
// only fast-forward when exactly one side changed. A true divergence (or a
// first-connect where both sides already have data) is surfaced to the UI for
// an explicit pull / push / merge choice instead of silently clobbering.

/** True when any syncable key holds non-trivial local data. */
const hasLocalData = () => {
  for (const localKey of SYNC_KEYS) {
    const raw = readLocal(SYNC_MAP[localKey]);
    if (raw == null) continue;
    if (Array.isArray(raw)) {
      if (raw.length > 0) return true;
      continue;
    }
    if (typeof raw === 'object') {
      const inner = raw.state && typeof raw.state === 'object' ? raw.state : raw;
      if (inner && Object.keys(inner).length > 0) return true;
      continue;
    }
    return true; // scalar non-null
  }
  return false;
};

/** Build the registry entry for the gist's last writer (for UI display). */
const remoteDeviceInfo = (remote) => {
  if (!remote || !remote.deviceId) return null;
  return remote.devices?.[remote.deviceId] || { name: 'Another device', os: 'Unknown', lastSeenAt: remote.updatedAt || null };
};

/**
 * Read the gist fresh and classify the local↔remote relationship against the
 * last-synced base hash. Does NOT mutate anything.
 *
 * Returns:
 *   { status: 'clean' | 'ahead' | 'behind' | 'diverged',
 *     firstSync?: boolean, remote, remoteDevice, localDevice, remoteUpdatedAt }
 *
 *   - 'ahead'   → only local changed since base → safe to push
 *   - 'behind'  → only remote changed since base → safe to pull
 *   - 'diverged'→ both changed (or first-connect with data on both sides) → ask
 */
const previewSync = async () => {
  if (!enabled) return { status: 'clean', disabled: true };

  let remote;
  try {
    remote = await readRemote();
  } catch (err) {
    return { status: 'clean', error: err.message };
  }

  const fp = readFingerprint();
  const localHash = hashLocalState();
  const remoteHash = remote && !remote.notFound ? remote.hash : null;

  // Never synced on this device (no base recorded).
  if (fp.remote == null) {
    if (remoteHash != null && hasLocalData()) {
      return {
        status: 'diverged',
        firstSync: true,
        remote,
        remoteDevice: remoteDeviceInfo(remote),
        localDevice: myDeviceEntry(),
        remoteUpdatedAt: remote?.updatedAt || null,
      };
    }
    if (remoteHash != null) return { status: 'behind', remote };
    if (hasLocalData()) return { status: 'ahead', remote };
    return { status: 'clean', remote };
  }

  const localChanged = localHash !== fp.local;
  const remoteChanged = remoteHash !== fp.remote;

  const info = {
    remote,
    remoteDevice: remoteDeviceInfo(remote),
    localDevice: myDeviceEntry(),
    remoteUpdatedAt: remote?.updatedAt || null,
  };

  if (!localChanged && !remoteChanged) return { status: 'clean', ...info };
  if (!localChanged && remoteChanged) return { status: 'behind', ...info };
  if (localChanged && !remoteChanged) return { status: 'ahead', ...info };
  return { status: 'diverged', ...info };
};

/** Replace a single local key with the remote value (remote wins, verbatim). */
const adoptRemote = (localKey, entry) => {
  const storageKey = SYNC_MAP[localKey];

  if (ARRAY_KEYS.has(localKey)) {
    const set = normalizeElementSet(entry.v, entry.t);
    writeLocal(storageKey, elementSetToArray(set, []));
    writeMeta(localKey, set);
    return;
  }

  if (localKey === 'undistracted_settings') {
    const { fields, version } = normalizeSettings(entry.v, entry.t);
    const nextRaw = { state: elementSetToObject({ items: fields, deleted: {} }) };
    if (version !== undefined) nextRaw.version = version;
    writeLocal(storageKey, nextRaw);
    writeMeta(localKey, { fields: { items: fields, deleted: {} } });
    return;
  }

  if (localKey === 'widget_instances') {
    const { instances, widgetSettings, version } = normalizeWidgetInstances(entry.v, entry.t);
    // Preserve local notes settings — notes are never synced in the config gist.
    const localRaw = readLocal(storageKey);
    const localNotes = localRaw?.state?.widgetSettings?.notes;
    const newWs = elementSetToObject(widgetSettings);
    if (localNotes) newWs.notes = localNotes;
    const nextRaw = {
      state: { instances: elementSetToArray(instances, []), widgetSettings: newWs },
    };
    if (version !== undefined) nextRaw.version = version;
    writeLocal(storageKey, nextRaw);
    writeMeta(localKey, { instances, widgetSettings });
    return;
  }

  if (localKey === 'focus_mode') {
    const { fields } = normalizeSettings(entry.v, entry.t);
    writeFocusModeState(elementSetToObject({ items: fields, deleted: {} }));
    writeMeta(localKey, { fields: { items: fields, deleted: {} } });
    return;
  }

  if (localKey === 'notes_index') {
    writeLocal(storageKey, entry.v && typeof entry.v === 'object' ? entry.v : {});
  }
};

/**
 * Pull: overwrite local state with the remote gist (remote wins). Used when the
 * user explicitly chooses "pull" to resolve a divergence, or on a clean
 * fast-forward where only the remote changed.
 */
const pullSync = async () => {
  if (!enabled) return { changed: false, reason: 'disabled' };

  let remote;
  try {
    remote = await readRemote();
  } catch (err) {
    reportError(err.message);
    return { changed: false, reason: 'error', error: err.message };
  }
  if (!remote || remote.notFound) return { changed: false, reason: 'no-cloud' };
  if (typeof remote.v === 'number' && remote.v > SYNC_SCHEMA_VERSION) {
    reportError('Sync data was written by a newer version of the app. Please update the app.');
    return { changed: false, reason: 'schema' };
  }

  clearError();
  let changed = false;
  const changedKeys = {};
  for (const localKey of SYNC_KEYS) {
    const entry = remote.keys?.[localKey];
    if (!entry) continue;
    adoptRemote(localKey, entry);
    changed = true;
    changedKeys[localKey] = true;
    notifyHooks(localKey);
  }

  if (changed) {
    // Rehydrate downstream stores (settings, widget instances) and any other
    // registered listeners so the UI reflects the pulled local state.
    refreshListeners.forEach((fn) => {
      try { fn(changedKeys); } catch { /* ignore */ }
    });
  }

  pendingConflict = null;
  lastSyncAt = now();
  lastMergeCount = SYNC_KEYS.length;
  recordFingerprint();
  onChangeCallbacks.forEach((cb) => {
    try { cb('_pull', null); } catch { /* ignore */ }
  });
  return { changed, reason: 'synced' };
};

/**
 * Push: overwrite the remote gist with local state (local wins). Used when the
 * user explicitly chooses "push" to resolve a divergence, or on a clean
 * fast-forward where only the local side changed.
 */
const pushSync = async () => {
  if (!enabled) return { changed: false, reason: 'disabled' };

  let remote;
  try {
    remote = await readRemote();
  } catch {
    remote = null;
  }

  // Build a fresh element set for every local key, stamping ALL items with now()
  // so local wins over anything remote (replace semantics, not merge).
  const keys = {};
  const metaUpdates = {};
  const ts = now();
  for (const localKey of SYNC_KEYS) {
    const raw = readLocalForKey(localKey);
    if (raw == null) continue;

    if (ARRAY_KEYS.has(localKey)) {
      const arr = preprocessArray(localKey, raw || []);
      if (!Array.isArray(arr) || arr.length === 0) continue;
      const set = arrayToElementSet(arr, { items: {}, deleted: {} }, ts);
      keys[localKey] = { v: set, t: ts };
      metaUpdates[localKey] = set;
    } else if (localKey === 'undistracted_settings') {
      const state = raw.state && typeof raw.state === 'object' ? raw.state : {};
      const set = mapToElementSet(state, { items: {}, deleted: {} }, ts);
      keys[localKey] = { v: { fields: set.items, version: raw.version ?? 0 }, t: ts };
      metaUpdates[localKey] = { fields: set };
    } else if (localKey === 'widget_instances') {
      const state = raw.state || {};
      const instances = Array.isArray(state.instances) ? state.instances : [];
      const ws = { ...(state.widgetSettings && typeof state.widgetSettings === 'object' ? state.widgetSettings : {}) };
      delete ws.notes; // never synced here
      const instSet = arrayToElementSet(instances, { items: {}, deleted: {} }, ts);
      const wsSet = mapToElementSet(ws, { items: {}, deleted: {} }, ts);
      keys[localKey] = { v: { instances: instSet, widgetSettings: wsSet, version: raw.version ?? 0 }, t: ts };
      metaUpdates[localKey] = { instances: instSet, widgetSettings: wsSet };
    } else if (localKey === 'focus_mode') {
      const state = readFocusModeState();
      const set = mapToElementSet(state, { items: {}, deleted: {} }, ts);
      keys[localKey] = { v: { fields: set.items, version: 0 }, t: ts };
      metaUpdates[localKey] = { fields: set };
    } else if (localKey === 'notes_index') {
      keys[localKey] = { v: raw, t: ts };
    }
  }

  const devices = mergedDevices(remote);

  try {
    await writeRemote(keys, devices);
  } catch (err) {
    reportError(err.message);
    return { changed: false, reason: 'error', error: err.message };
  }

  for (const [k, meta] of Object.entries(metaUpdates)) writeMeta(k, meta);
  for (const localKey of Object.keys(keys)) setLocalTs(localKey, ts);

  pendingConflict = null;
  lastSyncAt = now();
  recordFingerprint();
  clearError();
  onChangeCallbacks.forEach((cb) => {
    try { cb('_push', null); } catch { /* ignore */ }
  });
  return { changed: true, reason: 'synced' };
};

/**
 * Merge: the existing per-field / per-item last-write-wins union (pull then
 * push). Only offered for a *non-first* divergence, where both devices share a
 * base and their merge metadata is trustworthy.
 */
const mergeSync = async () => {
  if (!isExtension() || !enabled) return { changed: false, reason: 'disabled' };
  const pulled = await pullFromSync();
  const pushed = isSyncClean() ? { changed: false } : await pushAll();
  await runSyncHooks();
  const changed = Object.keys(pulled).length > 0 || !!pushed.changed;
  if (changed) {
    pendingConflict = null;
    lastSyncAt = now();
    recordFingerprint();
  }
  return { changed, reason: changed ? 'synced' : 'no-changes' };
};

// ── Polling (daily auto-sync, throttled to block continuous syncing) ──────────

/** True when enough time has passed since the last automatic sync. */
const canAutoSync = () => (now() - lastAutoSyncAt) >= SYNC_THROTTLE_MS;

/** Run one automatic sync cycle (classify, fast-forward, then hooks). */
const runAutoSync = async () => {
  lastAutoSyncAt = now();
  const preview = await previewSync();
  let changed = false;
  if (preview.status === 'behind') {
    changed = (await pullSync()).changed;
  } else if (preview.status === 'ahead') {
    changed = (await pushSync()).changed;
  } else if (preview.status === 'diverged') {
    // Never auto-resolve a divergence — surface it for a manual choice.
    pendingConflict = preview;
    onChangeCallbacks.forEach((cb) => {
      try { cb('_conflict', preview); } catch { /* ignore */ }
    });
  }
  await runSyncHooks();
  if (changed) lastSyncAt = now();
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
 * - Classifies local vs remote against the last-synced base.
 * - Fast-forwards (pull or push) when only one side changed.
 * - On a divergence (including first-connect with data on both sides), does NOT
 *   auto-merge — it surfaces a conflict for an explicit pull/push/merge choice.
 * - Starts daily auto-sync (throttled to block continuous syncing).
 */
const enableSync = async () => {
  if (!isExtension()) {
    console.log('[sync] Not available — not running as extension');
    return;
  }
  if (!syncTransport.isConnected()) {
    console.log('[sync] Enable skipped — Google Drive not connected');
    return;
  }

  enabled = true;
  writeLocal('sync_enabled', true);

  // Version the local sync state and run any pending migration.
  migrateSync(getLocalSyncVersion());
  setLocalSyncVersion();

  deviceId = readLocal('sync_device_id') || generateDeviceId();
  writeLocal('sync_device_id', deviceId);

  setupPolling();

  const preview = await previewSync();
  if (preview.status === 'behind') {
    await pullSync();
    await runSyncHooks();
  } else if (preview.status === 'ahead') {
    await pushSync();
    await runSyncHooks();
  } else if (preview.status === 'diverged') {
    pendingConflict = preview;
    onChangeCallbacks.forEach((cb) => {
      try { cb('_conflict', preview); } catch { /* ignore */ }
    });
  } else {
    recordFingerprint();
    lastSyncAt = now();
  }

  lastAutoSyncAt = now(); // start the 5-min throttle from connect
  console.log('[sync] Enabled — device:', deviceId);
};

/**
 * Disable cross-device sync — stops polling and clears pending push timers.
 * Does NOT delete the gist (user may reconnect later).
 */
const disableSync = () => {
  enabled = false;
  pendingConflict = null;
  writeLocal('sync_enabled', false);

  teardownPolling();
  console.log('[sync] Disabled');
};

/** Check if sync is currently enabled. */
const isSyncEnabled = () => enabled;

/**
 * Get sync status info for UI display.
 * Returns { available, enabled, connected, lastSyncAt, deviceId, lastError,
 *           pendingConflict, deviceInfo }.
 */
const getSyncStatus = () => ({
  available: isExtension(),
  enabled,
  connected: syncTransport.isConnected(),
  lastSyncAt,
  lastMergeCount,
  deviceId,
  lastError,
  pendingConflict,
  deviceInfo: getDeviceInfo(),
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

/**
 * Register a listener invoked whenever a sync pull/merge writes incoming
 * changes to localStorage. The callback receives the changed sync keys
 * (`{ <localKey>: true }`). Used by the sync-refresh bridge to rehydrate the
 * Zustand stores so the UI reflects merged settings and widget instances
 * immediately. Returns an unsubscribe function.
 */
const registerRefreshListener = (fn) => {
  refreshListeners.add(fn);
  return () => refreshListeners.delete(fn);
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
 * Force a manual sync cycle: classify the local↔remote relationship against the
 * base, then fast-forward (pull or push) when only one side changed. A true
 * divergence is NOT auto-resolved — it's returned so the UI can offer a
 * pull/push/merge choice. Post-sync hooks (notes sync) run regardless.
 *
 * Resolves to:
 *   { changed, status: 'clean'|'pulled'|'pushed'|'diverged'|'disabled',
 *     reason: 'synced'|'no-changes'|'disabled', preview }
 */
const forceSync = async () => {
  if (!isExtension() || !enabled) {
    return { changed: false, status: 'disabled', reason: 'disabled' };
  }

  const preview = await previewSync();
  let changed = false;
  let status;

  if (preview.status === 'behind') {
    changed = (await pullSync()).changed;
    status = 'pulled';
  } else if (preview.status === 'ahead') {
    changed = (await pushSync()).changed;
    status = 'pushed';
  } else if (preview.status === 'diverged') {
    pendingConflict = preview;
    status = 'diverged';
  } else {
    status = 'clean';
  }

  const hooks = await runSyncHooks();
  lastAutoSyncAt = now(); // manual sync resets the auto-sync throttle clock

  const didChange = changed || !!hooks.changed;
  if (didChange) lastSyncAt = now();

  onChangeCallbacks.forEach((cb) => {
    try { cb('_force', null); } catch { /* ignore */ }
  });

  return {
    changed: didChange,
    status,
    reason: didChange ? 'synced' : 'no-changes',
    preview,
  };
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

  if (wasEnabled && syncTransport.isConnected()) {
    await enableSync();
  } else if (wasEnabled && !syncTransport.isConnected()) {
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
  previewSync,
  pullSync,
  pushSync,
  mergeSync,
  forceSync,
  initSync,
  onSyncChange,
  registerSyncHook,
  registerRefreshListener,
  SYNC_MAP, // exposed so stores know which keys to watch
};

export default syncEngine;
