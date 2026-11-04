/**
 * DataHub — a single shared, timestamped store for all API-fetched data.
 *
 * Canvas, Focus Mode, and the background service worker all read and write
 * through this one hub instead of running independent fetch/poll cycles.
 *
 * Storage: `chrome.storage.local['um_datahub']` (falls back to localStorage in
 * dev/web). Every entry is namespaced and stamped with `updatedAt` on write:
 *
 *   {
 *     stocks:   { data, symbolsKey, updatedAt },
 *     weather:  { data, aqiData, lat, lon, updatedAt },
 *     rss:      { data, updatedAt },
 *     gcal:     { data, updatedAt },
 *     holidays: { data, updatedAt },
 *     joke:     { data, updatedAt },
 *   }
 *
 * Consumers subscribe via `subscribe()` and read a synchronous snapshot via
 * `getEntrySnapshot()`, so live background updates (SW prefetch) propagate
 * without any page-side polling interval.
 */

const HUB_KEY = "um_datahub";

const hasChromeStorage =
  typeof chrome !== "undefined" &&
  typeof chrome.storage?.local?.get === "function";
const hasWindow = typeof window !== "undefined";

const EMPTY = Object.freeze({});

let snapshot = null; // { [ns]: entry } | null until first read
const listeners = new Set();
let storageListenerAttached = false;

// Serialize writes so concurrent writers (e.g. SW prefetch alarms) can't
// clobber each other with a stale read-modify-write.
let writeChain = Promise.resolve();

function emit() {
  for (const fn of listeners) fn();
}

function attachStorageListener() {
  if (storageListenerAttached) return;
  storageListenerAttached = true;

  if (hasChromeStorage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local") return;
      const change = changes[HUB_KEY];
      if (!change) return;
      snapshot = change.newValue ?? EMPTY;
      emit();
    });
  } else if (hasWindow) {
    window.addEventListener("storage", (e) => {
      if (e.key !== HUB_KEY) return;
      try {
        snapshot = e.newValue ? JSON.parse(e.newValue) : EMPTY;
      } catch {
        snapshot = EMPTY;
      }
      emit();
    });
  }
}

async function readRaw() {
  if (snapshot) return snapshot;
  if (hasChromeStorage) {
    try {
      const result = await chrome.storage.local.get(HUB_KEY);
      snapshot = result?.[HUB_KEY] ?? EMPTY;
    } catch {
      snapshot = EMPTY;
    }
  } else if (hasWindow) {
    try {
      snapshot = JSON.parse(localStorage.getItem(HUB_KEY) || "null") ?? EMPTY;
    } catch {
      snapshot = EMPTY;
    }
  } else {
    snapshot = EMPTY;
  }
  return snapshot;
}

async function persist(hub) {
  if (hasChromeStorage) {
    try {
      await chrome.storage.local.set({ [HUB_KEY]: hub });
    } catch {
      /* ignore */
    }
  } else if (hasWindow) {
    try {
      localStorage.setItem(HUB_KEY, JSON.stringify(hub));
    } catch {
      /* ignore */
    }
  }
}

/** Subscribe to hub changes. Returns an unsubscribe function. */
export function subscribe(listener) {
  listeners.add(listener);
  attachStorageListener();
  return () => listeners.delete(listener);
}

/** Synchronous snapshot of the whole hub (stable reference). */
export function getSnapshot() {
  return snapshot ?? EMPTY;
}

/** Synchronous snapshot of one namespace's entry (stable reference). */
export function getEntrySnapshot(namespace) {
  return (snapshot ?? EMPTY)[namespace];
}

/** Read one namespace's entry (hydrates the snapshot on first call). */
export async function readEntry(namespace) {
  const hub = await readRaw();
  return hub[namespace] ?? null;
}

/** Write one namespace's entry, stamping `updatedAt`. */
export function writeEntry(namespace, data, meta = {}) {
  writeChain = writeChain.then(async () => {
    const hub = {
      ...(await readRaw()),
      [namespace]: { data, updatedAt: Date.now(), ...meta },
    };
    snapshot = hub;
    await persist(hub);
    emit();
  });
  return writeChain;
}

/** Remove one namespace's entry. */
export function removeEntry(namespace) {
  writeChain = writeChain.then(async () => {
    const hub = { ...(await readRaw()) };
    delete hub[namespace];
    snapshot = hub;
    await persist(hub);
    emit();
  });
  return writeChain;
}

export function isFresh(updatedAt, ttlMs) {
  return typeof updatedAt === "number" && Date.now() - updatedAt < ttlMs;
}
