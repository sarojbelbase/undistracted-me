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
  GIST_FILENAME,
  GIST_DESCRIPTION,
  GITHUB_USER_AGENT,
} from './githubAuth';

// ── Constants ─────────────────────────────────────────────────────────────────

const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000; // auto-sync once a day
const SYNC_THROTTLE_MS = 5 * 60 * 1000; // block continuous sync — min 5 min between auto-syncs

/** Max entries per array-type key when syncing (oldest trimmed first). */
const MAX_SYNC_ENTRIES = {
  'widget_events': 200,
  'widget_bookmarks': 100,
  'countdown_pinned': 50,
};

/** Keys that are eligible for sync. Map keeps localKey → itself for API compat. */
const SYNC_MAP = {
  'undistracted_settings': 'undistracted_settings',
  'widget_instances': 'widget_instances',
  'widget_events': 'widget_events',
  'widget_bookmarks': 'widget_bookmarks',
  'countdown_pinned': 'countdown_pinned',
  'notes_index': 'notes_index',
};
const SYNC_KEYS = Object.keys(SYNC_MAP);

// ── State ─────────────────────────────────────────────────────────────────────

let enabled = false;
let deviceId = '';
let lastSyncAt = null;
let lastError = null;
let lastAutoSyncAt = 0;
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

/**
 * Deep, key-order-independent equality for JSON-serializable values.
 * Used to skip redundant gist writes when nothing has changed.
 */
const deepEqual = (a, b) => {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => deepEqual(a[k], b[k]));
};

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

// ── Gist transport ────────────────────────────────────────────────────────────

const gistHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': GITHUB_USER_AGENT,
});

/**
 * Read the sync gist and return its parsed payload.
 * Returns null when not connected or unreadable, { notFound: true } on a 404,
 * or { keys: {...} } on success.
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
  if (!file || !file.content) return { keys: {} };
  try {
    const parsed = JSON.parse(file.content);
    return {
      keys: parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {},
    };
  } catch {
    return { keys: {} };
  }
};

/**
 * Create-or-update the sync gist with the given `keys` object. Returns the
 * gist id (creating the gist on first write).
 */
const writeGist = async (keys) => {
  const token = await getToken();
  if (!token) throw new Error('Not connected to GitHub');

  const payload = JSON.stringify({ v: 1, deviceId, updatedAt: now(), keys });
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
  clearError();

  const changes = {};
  for (const localKey of SYNC_KEYS) {
    const entry = remote.keys?.[localKey];
    if (!entry || typeof entry.t !== 'number') continue;

    const localTs = getLocalTs(localKey);
    if (entry.t > localTs) {
      // Notes index merges per-entry (union, newer `updatedAt` wins) instead of
      // whole-map replace, so concurrent note additions on two devices don't
      // clobber each other.
      if (localKey === 'notes_index') {
        writeLocal(localKey, mergeNotesIndex(readLocal(localKey), entry.v));
        setLocalTs(localKey, entry.t);
        changes[localKey] = true;
        continue;
      }

      // widget_instances is stripped of notes content on push — preserve the
      // local notes widget settings when adopting a remote snapshot.
      const value = localKey === 'widget_instances'
        ? preserveLocalNotes(entry.v)
        : entry.v;

      writeLocal(localKey, value);
      setLocalTs(localKey, entry.t);
      notifyHooks(localKey);
      changes[localKey] = true;
    }
  }

  if (Object.keys(changes).length > 0) lastSyncAt = now();
  return changes;
};

// ── Push: merge local → remote ────────────────────────────────────────────────

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

/** Trim an array to maxEntries, keeping the newest entries. */
const trimArray = (arr, maxEntries) => {
  if (!Array.isArray(arr)) return arr;
  if (arr.length <= maxEntries) return arr;
  return arr.slice(arr.length - maxEntries);
};

/**
 * Strip the notes widget's settings (`widgetSettings.notes`) from a
 * widget_instances snapshot. Notes content is synced through per-note private
 * gists (notesSync.js), never through the config gist.
 */
const stripNotesFromInstances = (value) => {
  const widgetSettings = value?.state?.widgetSettings;
  if (!widgetSettings || !widgetSettings.notes) return value;
  const stripped = { ...widgetSettings };
  delete stripped.notes;
  return { ...value, state: { ...value.state, widgetSettings: stripped } };
};

/**
 * Re-inject the local notes widget settings into a pulled widget_instances
 * snapshot. Because notes are stripped from the synced payload, adopting a
 * remote snapshot would otherwise erase local notes — the local notes object is
 * kept so note content survives the pull and is reconciled by notesSync.
 */
const preserveLocalNotes = (value) => {
  let localNotes = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.widgetSettings('notes'));
    if (raw) localNotes = JSON.parse(raw);
  } catch {
    /* ignore */
  }
  if (!localNotes) return value;
  return {
    ...value,
    state: {
      ...value?.state,
      widgetSettings: {
        ...value?.state?.widgetSettings,
        notes: localNotes,
      },
    },
  };
};

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
 * Get the value to sync for a given localKey, with sanitization applied
 * (strip GCal events, trim oversized arrays, drop notes content).
 */
const sanitizeForSync = (localKey, rawValue) => {
  if (rawValue === null || rawValue === undefined) return null;

  const maxEntries = MAX_SYNC_ENTRIES[localKey];

  // Zustand-persisted keys — value is { state: {...}, version: N }
  if (localKey === 'undistracted_settings' || localKey === 'widget_instances') {
    // Notes content is synced via per-note private gists (notesSync.js), so
    // strip the notes widget's settings from widget_instances to keep the
    // config gist free of note content.
    if (localKey === 'widget_instances') return stripNotesFromInstances(rawValue);
    return rawValue;
  }

  // Raw array keys — sanitize and trim
  if (Array.isArray(rawValue)) {
    let sanitized = rawValue;
    if (localKey === 'widget_events') sanitized = stripGcalEvents(sanitized);
    if (maxEntries) sanitized = trimArray(sanitized, maxEntries);
    return sanitized;
  }

  // For Zustand-wrapped array keys or unknown formats, pass through
  if (rawValue?.state && Array.isArray(rawValue.state)) {
    const sanitized = { ...rawValue };
    if (localKey === 'widget_events') sanitized.state = stripGcalEvents(rawValue.state);
    if (maxEntries) sanitized.state = trimArray(sanitized.state, maxEntries);
    return sanitized;
  }

  return rawValue;
};

/**
 * Push a single key from localStorage to the gist. Does nothing if sync is
 * disabled or if the value is unchanged. Writes are serialized through the
 * shared write queue. Resolves to { changed: boolean }.
 */
const pushKey = (localKey) => {
  if (!enabled) return Promise.resolve({ changed: false });
  if (!SYNC_MAP[localKey]) return Promise.resolve({ changed: false });

  const local = readLocal(localKey);
  if (local === null || local === undefined) return Promise.resolve({ changed: false });

  const sanitized = sanitizeForSync(localKey, local);
  if (sanitized === null) return Promise.resolve({ changed: false });

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

      // Remote is newer — adopt it instead of overwriting.
      if (keys[localKey] && keys[localKey].t >= ts) {
        writeLocal(localKey, keys[localKey].v);
        setLocalTs(localKey, keys[localKey].t);
        return { changed: false };
      }

      // Unchanged — skip the write.
      if (keys[localKey] && deepEqual(keys[localKey].v, sanitized)) {
        return { changed: false };
      }

      keys[localKey] = { v: sanitized, t: ts };
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
        const local = readLocal(localKey);
        if (local === null || local === undefined) continue;

        const sanitized = sanitizeForSync(localKey, local);
        if (sanitized === null) continue;

        // Skip if the remote already holds this exact value (no change).
        if (keys[localKey] && deepEqual(keys[localKey].v, sanitized)) continue;

        const ts = now();
        keys[localKey] = { v: sanitized, t: ts };
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

  const changed = Object.keys(pulled).length > 0 || !!pushed.changed || !!hooks.changed;
  if (changed) lastSyncAt = now();

  onChangeCallbacks.forEach((cb) => {
    try {
      cb('_force', null);
    } catch {
      /* ignore */
    }
  });

  return { changed, reason: changed ? 'synced' : 'no-changes' };
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
