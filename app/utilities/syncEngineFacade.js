/**
 * Lazy facade for the cross-device sync engine.
 *
 * The real engine (syncEngine.js) plus its dependencies (syncTransport,
 * syncMerge, focusModeState) account for the bulk of the shared "sync" chunk.
 * Sync is only meaningful once the user has enabled it, so this facade defers
 * `import('./syncEngine')` until sync is actually turned on. When sync is off,
 * every method is a cheap no-op / default and the heavy engine is never fetched
 * or parsed on the new-tab critical path.
 *
 * Consumers import this facade instead of `./syncEngine` directly. The API
 * surface mirrors the real engine's default export exactly.
 *
 * Subscriptions (onSyncChange / registerSyncHook / registerRefreshListener)
 * registered before the engine loads are buffered and replayed on first load,
 * so callers that register at module scope (e.g. notesSync) keep working.
 */

import { isExtension } from './isExtension';

let engine = null;
let enginePromise = null;

const pendingChangeCbs = new Set();
const pendingSyncHooks = new Set();
const pendingRefreshListeners = new Set();

/** Loads the real engine once, replaying any buffered subscriptions. */
const ensureLoaded = () => {
  if (!enginePromise) {
    enginePromise = import('./syncEngine').then((m) => {
      engine = m.default;
      pendingChangeCbs.forEach((cb) => engine.onSyncChange(cb));
      pendingSyncHooks.forEach((fn) => engine.registerSyncHook(fn));
      pendingRefreshListeners.forEach((fn) => engine.registerRefreshListener(fn));
      pendingChangeCbs.clear();
      pendingSyncHooks.clear();
      pendingRefreshListeners.clear();
      return engine;
    });
  }
  return enginePromise;
};

/** Reads the persisted enable flag synchronously (no engine load required). */
const isEnabledFlag = () => {
  try {
    return localStorage.getItem('sync_enabled') === 'true';
  } catch {
    return false;
  }
};

const DISABLED_STATUS = {
  available: isExtension(),
  enabled: false,
  connected: false,
  lastSyncAt: null,
  lastMergeCount: 0,
  deviceId: null,
  lastError: null,
  pendingConflict: null,
  deviceInfo: null,
};

const facade = {
  // No-op by design — matches the real engine, where sync is intentionally not
  // continuous (changes push on the next daily/manual sync, not per-edit).
  schedulePush: () => {},

  initSync: () => {
    if (!isEnabledFlag()) return Promise.resolve();
    return ensureLoaded().then((e) => e.initSync());
  },

  enableSync: () => ensureLoaded().then((e) => e.enableSync()),

  disableSync: () => {
    if (engine) {
      engine.disableSync();
      return;
    }
    // Engine never loaded — nothing to tear down; just clear the flag.
    try {
      localStorage.setItem('sync_enabled', 'false');
    } catch {
      /* ignore */
    }
  },

  isSyncEnabled: () => (engine ? engine.isSyncEnabled() : isEnabledFlag()),

  getSyncStatus: () => (engine ? engine.getSyncStatus() : DISABLED_STATUS),

  onSyncChange: (cb) => {
    if (engine) return engine.onSyncChange(cb);
    pendingChangeCbs.add(cb);
    return () => pendingChangeCbs.delete(cb);
  },

  registerSyncHook: (fn) => {
    if (engine) return engine.registerSyncHook(fn);
    pendingSyncHooks.add(fn);
    return () => pendingSyncHooks.delete(fn);
  },

  registerRefreshListener: (fn) => {
    if (engine) return engine.registerRefreshListener(fn);
    pendingRefreshListeners.add(fn);
    return () => pendingRefreshListeners.delete(fn);
  },

  forceSync: async () => {
    if (!isEnabledFlag() && !engine) {
      return { changed: false, status: 'disabled', reason: 'disabled' };
    }
    const e = await ensureLoaded();
    return e.forceSync();
  },

  pullSync: async () => (await ensureLoaded()).pullSync(),
  pushSync: async () => (await ensureLoaded()).pushSync(),
  mergeSync: async () => (await ensureLoaded()).mergeSync(),
  pushKey: async (k) => (await ensureLoaded()).pushKey(k),
  pullFromSync: async () => (await ensureLoaded()).pullFromSync(),
  pushAll: async () => (await ensureLoaded()).pushAll(),
  previewSync: async () => (await ensureLoaded()).previewSync(),
};

export default facade;
