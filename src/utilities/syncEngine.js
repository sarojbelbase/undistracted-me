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
 *   - On change: debounced (500ms) push of a single key. Gists have no push
 *     channel, so remote changes are discovered by polling (30s + on focus).
 *   - Writes are serialized through a promise queue to avoid races.
 *
 * What syncs:
 *   - Settings (undistracted_settings)
 *   - Widget instances + per-widget settings (widget_instances)
 *   - Events (widget_events) — native only, GCal events are stripped
 *   - Bookmarks (widget_bookmarks)
 *   - Countdown pinned (countdown_pinned)
 *
 * What does NOT sync:
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
} from './githubAuth';

// ── Constants ─────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 500;
const POLL_INTERVAL_MS = 30000; // gists have no push — poll for remote changes

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
};
const SYNC_KEYS = Object.keys(SYNC_MAP);

// ── State ─────────────────────────────────────────────────────────────────────

let enabled = false;
let deviceId = '';
let lastSyncAt = null;
let debounceTimers = {};
let pollTimer = null;
let pollCleanup = null;
let writeQueue = Promise.resolve();
let onChangeCallbacks = new Set(); // external listeners for UI updates

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

// ── Gist transport ────────────────────────────────────────────────────────────

const gistHeaders = (token) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
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
  if (!res.ok) throw new Error(`GitHub read failed (${res.status})`);

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
    if (!res.ok) throw new Error(`Failed to create gist (${res.status})`);
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
  if (!res.ok) throw new Error(`Failed to update gist (${res.status})`);
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
    console.warn('[sync] pull failed:', err.message);
    return {};
  }
  if (!remote || remote.notFound) return {};

  const changes = {};
  for (const localKey of SYNC_KEYS) {
    const entry = remote.keys?.[localKey];
    if (!entry || typeof entry.t !== 'number') continue;

    const localTs = getLocalTs(localKey);
    if (entry.t > localTs) {
      writeLocal(localKey, entry.v);
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
 * Get the value to sync for a given localKey, with sanitization applied
 * (strip GCal events, trim oversized arrays).
 */
const sanitizeForSync = (localKey, rawValue) => {
  if (rawValue === null || rawValue === undefined) return null;

  const maxEntries = MAX_SYNC_ENTRIES[localKey];

  // Zustand-persisted keys — value is { state: {...}, version: N }
  if (localKey === 'undistracted_settings' || localKey === 'widget_instances') {
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
 * disabled. Writes are serialized through the shared write queue.
 */
const pushKey = (localKey) => {
  if (!enabled) return Promise.resolve();
  if (!SYNC_MAP[localKey]) return Promise.resolve();

  const local = readLocal(localKey);
  if (local === null || local === undefined) return Promise.resolve();

  const sanitized = sanitizeForSync(localKey, local);
  if (sanitized === null) return Promise.resolve();

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

      // Remote is newer/equal — adopt it instead of overwriting.
      if (keys[localKey] && keys[localKey].t >= ts) {
        writeLocal(localKey, keys[localKey].v);
        setLocalTs(localKey, keys[localKey].t);
        return;
      }

      keys[localKey] = { v: sanitized, t: ts };
      await writeGist(keys);
      setLocalTs(localKey, ts);
      lastSyncAt = ts;
    })
    .catch((err) => {
      console.warn('[sync] push failed:', err.message);
    });

  return writeQueue;
};

/** Debounced push — multiple rapid changes to a key result in a single push. */
const schedulePush = (localKey) => {
  if (debounceTimers[localKey]) clearTimeout(debounceTimers[localKey]);
  debounceTimers[localKey] = setTimeout(() => {
    delete debounceTimers[localKey];
    pushKey(localKey);
  }, DEBOUNCE_MS);
};

/** Push all syncable keys immediately (used on first enable). */
const pushAll = async () => {
  if (!enabled) return;

  writeQueue = writeQueue
    .then(async () => {
      let remote;
      try {
        remote = await readGist();
      } catch {
        remote = { keys: {} };
      }

      const keys = { ...(remote?.keys || {}) };
      for (const localKey of SYNC_KEYS) {
        const local = readLocal(localKey);
        if (local === null || local === undefined) continue;

        const sanitized = sanitizeForSync(localKey, local);
        if (sanitized === null) continue;

        const ts = now();
        if (keys[localKey] && keys[localKey].t >= ts) continue;
        keys[localKey] = { v: sanitized, t: ts };
        setLocalTs(localKey, ts);
      }

      await writeGist(keys);
      lastSyncAt = now();
    })
    .catch((err) => {
      console.warn('[sync] pushAll failed:', err.message);
    });

  return writeQueue;
};

// ── Polling (replaces chrome.storage.onChanged) ───────────────────────────────

const setupPolling = () => {
  if (pollTimer || !isExtension()) return;

  pollTimer = setInterval(() => {
    if (enabled) pullFromSync();
  }, POLL_INTERVAL_MS);

  const onVis = () => {
    if (enabled && document.visibilityState === 'visible') pullFromSync();
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
 * - Starts polling for remote changes.
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

  Object.values(debounceTimers).forEach(clearTimeout);
  debounceTimers = {};

  teardownPolling();
  console.log('[sync] Disabled');
};

/** Check if sync is currently enabled. */
const isSyncEnabled = () => enabled;

/**
 * Get sync status info for UI display.
 * Returns { available, enabled, connected, lastSyncAt, deviceId }.
 */
const getSyncStatus = () => ({
  available: isExtension(),
  enabled,
  connected: isConnected(),
  lastSyncAt,
  deviceId,
});

/**
 * Subscribe to sync change events (e.g., for UI status badge updates).
 * Returns an unsubscribe function.
 */
const onSyncChange = (callback) => {
  onChangeCallbacks.add(callback);
  return () => onChangeCallbacks.delete(callback);
};

/** Force a full sync cycle: pull remote, push local, then notify listeners. */
const forceSync = async () => {
  if (!isExtension() || !enabled) return;
  await pullFromSync();
  await pushAll();
  onChangeCallbacks.forEach((cb) => {
    try {
      cb('_force', null);
    } catch {
      /* ignore */
    }
  });
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
  SYNC_MAP, // exposed so stores know which keys to watch
};

export default syncEngine;
