/**
 * Cross-device Sync Engine
 *
 * Syncs settings, widget instances, events, and bookmarks across all signed-in
 * Chrome instances via chrome.storage.sync. Last-write-wins with per-key
 * timestamps. Debounced writes (500ms) to respect the ~1 write/sec rate limit.
 *
 * Architecture:
 *   - Each syncable key is stored as { v: <value>, t: <epochMs> } in
 *     chrome.storage.sync under a namespaced prefix (`sync_v1_`).
 *   - On load: pull all keys, merge with local (higher timestamp wins).
 *   - On change: push to sync after 500ms debounce.
 *   - Listens for chrome.storage.onChanged to react to remote changes.
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

// ── Constants ─────────────────────────────────────────────────────────────────

const SYNC_PREFIX = 'sync_v1_';
const META_KEY = SYNC_PREFIX + 'meta';
const DEBOUNCE_MS = 500;
const MAX_ITEM_BYTES = 8000; // chrome.storage.sync per-item limit (8KB)
const MAX_TOTAL_BYTES = 90000; // soft limit (100KB total, leave 10KB headroom)
const QUOTA_WARNING_KEY = 'sync_quota_warning';

/** Max entries per array-type key when syncing (oldest trimmed first). */
const MAX_SYNC_ENTRIES = {
  'widget_events': 200,
  'widget_bookmarks': 100,
  'countdown_pinned': 50,
};

/** Keys that are eligible for sync (localStorage key → sync key mapping). */
const SYNC_MAP = {
  'undistracted_settings': SYNC_PREFIX + 'settings',
  'widget_instances': SYNC_PREFIX + 'widget_instances',
  'widget_events': SYNC_PREFIX + 'events',
  'widget_bookmarks': SYNC_PREFIX + 'bookmarks',
  'countdown_pinned': SYNC_PREFIX + 'countdown_pinned',
};

// ── State ─────────────────────────────────────────────────────────────────────

let enabled = false;
let deviceId = '';
let lastSyncAt = null;
let debounceTimers = {};
let changeListener = null;
let onChangeCallbacks = new Set(); // external listeners for UI updates

// ── Helpers ───────────────────────────────────────────────────────────────────

const isExtension = () =>
  typeof chrome !== 'undefined' && !!chrome?.runtime?.id && !!chrome?.storage?.sync;

/** Generate a short random device ID for metadata tracking. */
const generateDeviceId = () =>
  'dev_' + Math.random().toString(36).slice(2, 8) + '_' + Date.now().toString(36);

/** Estimate JSON byte size. */
const byteSize = (val) => new Blob([JSON.stringify(val)]).size;

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
  } catch { /* ignore */ }
};

/** Write a wrapped value to chrome.storage.sync. */
const writeSync = async (syncKey, wrapped) => {
  if (!isExtension()) return false;
  try {
    await chrome.storage.sync.set({ [syncKey]: wrapped });
    return true;
  } catch (err) {
    // Quota exceeded — mark and stop syncing this key
    if (err.message?.includes('QUOTA') || err.message?.includes('MAX')) {
      console.warn('[sync] Quota exceeded for', syncKey);
      try {
        localStorage.setItem(QUOTA_WARNING_KEY, '1');
      } catch { /* ignore */ }
    }
    return false;
  }
};

/** Read all sync keys from chrome.storage.sync. Returns { [syncKey]: wrapped }. */
const readAllSync = async () => {
  if (!isExtension()) return {};
  try {
    const allKeys = [META_KEY, ...Object.values(SYNC_MAP)];
    return await chrome.storage.sync.get(allKeys);
  } catch {
    return {};
  }
};

// ── Event dispatch for hooks ──────────────────────────────────────────────────

/**
 * Dispatch a window event so hooks (useEvents, etc.) pick up changes
 * that were written to localStorage by the sync engine.
 */
const notifyHooks = (localKey) => {
  // Events: the useEvents hook listens for 'widget_events_changed'
  if (localKey === STORAGE_KEYS.EVENTS) {
    try { window.dispatchEvent(new Event('widget_events_changed')); } catch { /* ignore */ }
  }
  // For other keys, hooks subscribe via Zustand — no custom event needed.
  // Zustand re-reads from localStorage on next page load.
  // For in-session sync pulls, the onChangeCallbacks notify SyncStatusBadge.
};

// ── Pull: merge remote → local ────────────────────────────────────────────────

/**
 * Pull all syncable data from chrome.storage.sync and merge into localStorage
 * using last-write-wins (higher timestamp wins).
 *
 * Returns an object describing what changed: { settings, widgetInstances, events, ... }
 * Each entry is true if remote was newer, false if local was kept.
 */
const pullFromSync = async () => {
  if (!isExtension() || !enabled) return {};

  const synced = await readAllSync();
  const changes = {};

  for (const [localKey, syncKey] of Object.entries(SYNC_MAP)) {
    const remote = synced[syncKey];
    if (!remote || typeof remote.t !== 'number') continue;

    const localTs = getLocalTs(localKey);
    const remoteTs = remote.t;

    if (remoteTs > localTs) {
      // Remote is newer — adopt it
      writeLocal(localKey, remote.v);
      setLocalTs(localKey, remoteTs);
      notifyHooks(localKey);
      changes[localKey] = true;
    }
    // If local is newer or same, keep local (already in localStorage)
  }

  if (Object.keys(changes).length > 0) {
    lastSyncAt = now();
  }

  return changes;
};

// ── Push: merge local → remote ────────────────────────────────────────────────

// ── Sanitization ──────────────────────────────────────────────────────────────

/**
 * Strip Google Calendar events from an events array.
 * GCal events have a `calendarId` field or `source === 'gcal'` — they're
 * auto-populated on sign-in, so syncing them wastes quota and is redundant.
 */
const stripGcalEvents = (events) => {
  if (!Array.isArray(events)) return events;
  return events.filter(
    (e) => !e?.calendarId && e?.source !== 'gcal' && !e?.gcalEventId,
  );
};

/**
 * Trim an array to maxEntries, keeping the newest entries.
 * Assumes array is ordered oldest→newest (or trims from the start).
 * Returns a new array (does not mutate original).
 */
const trimArray = (arr, maxEntries) => {
  if (!Array.isArray(arr)) return arr;
  if (arr.length <= maxEntries) return arr;
  return arr.slice(arr.length - maxEntries);
};

/**
 * Get the value to sync for a given localKey, with sanitization applied:
 *   - `widget_events`: strips GCal events, trims to MAX_SYNC_ENTRIES
 *   - `widget_bookmarks`: trims to MAX_SYNC_ENTRIES
 *   - `countdown_pinned`: trims to MAX_SYNC_ENTRIES
 *   - All others: passed through as-is
 *
 * For Zustand-persisted keys (settings, widget_instances), the value is
 * already wrapped as { state: {...}, version: N } — we sync the whole wrapper.
 * For raw array keys (events, bookmarks), we extract and sanitize the array.
 */
const sanitizeForSync = (localKey, rawValue) => {
  if (rawValue === null || rawValue === undefined) return null;

  const maxEntries = MAX_SYNC_ENTRIES[localKey];

  // Zustand-persisted keys — value is { state: {...}, version: N }
  if (localKey === 'undistracted_settings' || localKey === 'widget_instances') {
    // Pass through as-is (settings/instances are objects, not unbounded arrays)
    return rawValue;
  }

  // Raw array keys — sanitize and trim
  if (Array.isArray(rawValue)) {
    let sanitized = rawValue;

    // Strip GCal events (only for the events key)
    if (localKey === 'widget_events') {
      sanitized = stripGcalEvents(sanitized);
    }

    // Trim to max entries
    if (maxEntries) {
      sanitized = trimArray(sanitized, maxEntries);
    }

    return sanitized;
  }

  // For Zustand-wrapped array keys or unknown formats, pass through
  if (rawValue?.state && Array.isArray(rawValue.state)) {
    const sanitized = { ...rawValue };
    if (localKey === 'widget_events') {
      sanitized.state = stripGcalEvents(rawValue.state);
    }
    if (maxEntries) {
      sanitized.state = trimArray(sanitized.state, maxEntries);
    }
    return sanitized;
  }

  return rawValue;
};

/**
 * Estimate total bytes currently used in chrome.storage.sync by this extension.
 * Returns sum of byte sizes of all synced keys + meta.
 */
const estimateTotalSyncBytes = async () => {
  if (!isExtension()) return 0;
  try {
    const all = await readAllSync();
    let total = 0;
    for (const val of Object.values(all)) {
      total += byteSize(val);
    }
    return total;
  } catch {
    return 0;
  }
};

/**
 * Push a single key from localStorage to chrome.storage.sync.
 * Does NOT push if sync is disabled or the value is too large.
 */
const pushKey = async (localKey) => {
  if (!isExtension() || !enabled) return;

  const syncKey = SYNC_MAP[localKey];
  if (!syncKey) return;

  const local = readLocal(localKey);
  if (local === null || local === undefined) return;

  // Sanitize: strip GCal events, trim oversized arrays
  const sanitized = sanitizeForSync(localKey, local);
  if (sanitized === null) return;

  // Check per-item size — skip if exceeds 8KB limit
  const size = byteSize(sanitized);
  if (size > MAX_ITEM_BYTES) {
    console.warn('[sync]', localKey, 'exceeds per-item limit (' + size + ' bytes), skipping');
    return;
  }

  // Check total quota before writing
  const totalBytes = await estimateTotalSyncBytes();
  if (totalBytes + size > MAX_TOTAL_BYTES) {
    console.warn(
      '[sync] Quota nearly full (' + totalBytes + ' / ' + MAX_TOTAL_BYTES +
      ' bytes), skipping ' + localKey,
    );
    try { localStorage.setItem(QUOTA_WARNING_KEY, '1'); } catch { /* ignore */ }
    return;
  }

  const ts = now();
  const wrapped = { v: sanitized, t: ts };
  const ok = await writeSync(syncKey, wrapped);

  if (ok) {
    setLocalTs(localKey, ts);
    lastSyncAt = ts;
    // Clear quota warning on successful write
    try { localStorage.removeItem(QUOTA_WARNING_KEY); } catch { /* ignore */ }
    updateMeta();
  }
};

/**
 * Debounced push — schedules a push after DEBOUNCE_MS of inactivity.
 * Multiple rapid changes to the same key result in a single push.
 */
const schedulePush = (localKey) => {
  if (debounceTimers[localKey]) {
    clearTimeout(debounceTimers[localKey]);
  }
  debounceTimers[localKey] = setTimeout(() => {
    delete debounceTimers[localKey];
    pushKey(localKey);
  }, DEBOUNCE_MS);
};

/**
 * Push all syncable keys immediately (used on first enable).
 */
const pushAll = async () => {
  if (!isExtension() || !enabled) return;
  for (const localKey of Object.keys(SYNC_MAP)) {
    await pushKey(localKey);
  }
};

// ── Metadata ──────────────────────────────────────────────────────────────────

const updateMeta = async () => {
  if (!isExtension()) return;
  try {
    await chrome.storage.sync.set({
      [META_KEY]: {
        deviceId,
        lastSync: now(),
        version: 1,
      },
    });
  } catch { /* ignore */ }
};

// ── Remote change listener ────────────────────────────────────────────────────

/**
 * Listen for chrome.storage.onChanged events from other devices.
 * When a synced key changes remotely, pull it into localStorage.
 */
const setupChangeListener = () => {
  if (!isExtension()) return;
  if (changeListener) return;

  changeListener = (changes, areaName) => {
    if (areaName !== 'sync' || !enabled) return;

    for (const [syncKey, change] of Object.entries(changes)) {
      if (!syncKey.startsWith(SYNC_PREFIX) || syncKey === META_KEY) continue;
      if (!change.newValue) continue; // key was deleted

      // Find the local key for this sync key
      const localKey = Object.entries(SYNC_MAP).find(
        ([, sk]) => sk === syncKey
      )?.[0];
      if (!localKey) continue;

      const remote = change.newValue;
      if (typeof remote.t !== 'number') continue;

      const localTs = getLocalTs(localKey);

      if (remote.t > localTs) {
        // Remote is newer — adopt
        writeLocal(localKey, remote.v);
        setLocalTs(localKey, remote.t);
        notifyHooks(localKey);
        lastSyncAt = now();

        // Notify external listeners (e.g., SyncStatusBadge)
        onChangeCallbacks.forEach((cb) => {
          try { cb(localKey, adopted); } catch { /* ignore */ }
        });
      }
    }
  };

  chrome.storage.onChanged.addListener(changeListener);
};

const teardownChangeListener = () => {
  if (changeListener && isExtension()) {
    chrome.storage.onChanged.removeListener(changeListener);
    changeListener = null;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Enable cross-device sync.
 * - Pulls remote data and merges with local (last-write-wins).
 * - Pushes all local data to sync.
 * - Starts listening for remote changes.
 */
const enableSync = async () => {
  if (!isExtension()) {
    console.log('[sync] Not available — not running as extension');
    return;
  }

  enabled = true;
  writeLocal('sync_enabled', true);

  // Load or generate device ID
  deviceId = readLocal('sync_device_id') || generateDeviceId();
  writeLocal('sync_device_id', deviceId);

  // First pull: merge remote into local
  const changes = await pullFromSync();

  // Then push: upload local to remote (our data wins where local is newer)
  await pushAll();

  // Start listening
  setupChangeListener();

  // Notify listeners of initial pull changes
  if (Object.keys(changes).length > 0) {
    onChangeCallbacks.forEach((cb) => {
      try { cb('_initial_pull', changes); } catch { /* ignore */ }
    });
  }

  lastSyncAt = now();
  console.log('[sync] Enabled — device:', deviceId);
};

/**
 * Disable cross-device sync.
 * - Stops listening for remote changes.
 * - Clears pending push timers.
 * - Does NOT delete already-synced data from chrome.storage.sync
 *   (user may re-enable later on same device).
 */
const disableSync = () => {
  enabled = false;
  writeLocal('sync_enabled', false);

  // Clear pending timers
  Object.values(debounceTimers).forEach(clearTimeout);
  debounceTimers = {};

  teardownChangeListener();
  console.log('[sync] Disabled');
};

/**
 * Check if sync is currently enabled.
 */
const isSyncEnabled = () => enabled;

/**
 * Get sync status info for UI display.
 * Returns { enabled, lastSyncAt, deviceId, quotaWarning, totalBytes }.
 * totalBytes is populated asynchronously — callers should re-check after a tick.
 */
const getSyncStatus = () => {
  let quotaWarning = false;
  try {
    quotaWarning = localStorage.getItem(QUOTA_WARNING_KEY) === '1';
  } catch { /* ignore */ }
  return {
    enabled,
    lastSyncAt,
    deviceId,
    quotaWarning,
    available: isExtension(),
  };
};

/**
 * Get quota usage info. Async — fetches from chrome.storage.sync.
 * Returns { totalBytes, percentUsed }.
 */
const getQuotaInfo = async () => {
  const totalBytes = await estimateTotalSyncBytes();
  const percentUsed = Math.round((totalBytes / MAX_TOTAL_BYTES) * 100);
  return { totalBytes, percentUsed, maxBytes: MAX_TOTAL_BYTES };
};

/**
 * Subscribe to sync change events (e.g., for UI status badge updates).
 * Returns an unsubscribe function.
 */
const onSyncChange = (callback) => {
  onChangeCallbacks.add(callback);
  return () => onChangeCallbacks.delete(callback);
};

/**
 * Force a full sync cycle: pull remote, push local.
 */
const forceSync = async () => {
  if (!isExtension() || !enabled) return;
  await pullFromSync();
  await pushAll();
};

/**
 * Initialize sync on app load. Checks if sync was previously enabled
 * and re-enables it silently.
 */
const initSync = async () => {
  if (!isExtension()) return;

  let wasEnabled = false;
  try {
    wasEnabled = localStorage.getItem('sync_enabled') === 'true';
  } catch { /* ignore */ }

  if (wasEnabled) {
    await enableSync();
  }
};

// ── Export ────────────────────────────────────────────────────────────────────

const syncEngine = {
  enableSync,
  disableSync,
  isSyncEnabled,
  getSyncStatus,
  getQuotaInfo,
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
