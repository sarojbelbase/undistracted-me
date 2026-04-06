/**
 * Google Calendar API utilities.
 *
 * Auth is handled by googleAuth.js which works on both Chrome and Firefox.
 * Chrome  → chrome.identity.getAuthToken() (seamless, no user setup needed)
 * Firefox → PKCE flow via launchWebAuthFlow() (requires Desktop App client in GCP)
 */
import { getGoogleAuthToken, removeGoogleAuthToken, isGoogleAuthAvailable } from './googleAuth';

export { isGoogleAuthAvailable };

const CALENDAR_API =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// ─── Local cache ────────────────────────────────────────────────────────────

const GCAL_CACHE_KEY = 'gcal_events_cache';
const GCAL_DISCONNECTED_KEY = 'gcal_disconnected';
const GCAL_SYNCED_AT_KEY = 'gcal_synced_at';
// Non-sensitive boolean flag kept in localStorage so hasCachedGcalEvents() is synchronous.
// The actual event data (which is PII) lives in chrome.storage.local.
const GCAL_HAS_CACHE_FLAG = 'gcal_has_cache';

function setDisconnectedFlag() {
  try { localStorage.setItem(GCAL_DISCONNECTED_KEY, '1'); } catch { /* ignore */ }
}

export function clearDisconnectedFlag() {
  try { localStorage.removeItem(GCAL_DISCONNECTED_KEY); } catch { /* ignore */ }
}

function isDisconnected() {
  try { return localStorage.getItem(GCAL_DISCONNECTED_KEY) === '1'; } catch { return false; }
}

export function loadGcalSyncedAt() {
  try { return JSON.parse(localStorage.getItem(GCAL_SYNCED_AT_KEY) || 'null'); } catch { return null; }
}

function saveGcalSyncedAt() {
  try { localStorage.setItem(GCAL_SYNCED_AT_KEY, JSON.stringify(Date.now())); } catch { /* ignore */ }
}

/** Synchronous check — true if cached events exist (non-PII boolean flag). */
export function hasCachedGcalEvents() {
  return localStorage.getItem(GCAL_HAS_CACHE_FLAG) === '1';
}

// Module-level memory cache — populated on first chrome.storage.local read,
// updated synchronously on every write/clear so subsequent reads within the
// same page session are instant (no IPC round-trip).
let _eventsMemCache = null; // null = not yet loaded

/**
 * Load previously cached events.
 * First call: reads from chrome.storage.local (~1ms async IPC).
 * Subsequent calls in the same page session: returns from memory instantly.
 */
export async function loadCachedGcalEvents() {
  if (_eventsMemCache !== null) return _eventsMemCache;

  // One-time migration: move events from old localStorage to chrome.storage.local.
  const legacyRaw = localStorage.getItem(GCAL_CACHE_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy) && legacy.length > 0) {
        await chrome.storage.local.set({ [GCAL_CACHE_KEY]: legacy }); // eslint-disable-line no-undef
        localStorage.setItem(GCAL_HAS_CACHE_FLAG, '1');
      }
    } catch { /* ignore malformed legacy data */ }
    localStorage.removeItem(GCAL_CACHE_KEY);
  }

  const result = await chrome.storage.local.get(GCAL_CACHE_KEY); // eslint-disable-line no-undef
  _eventsMemCache = result[GCAL_CACHE_KEY] ?? [];
  return _eventsMemCache;
}

async function saveCachedGcalEvents(events) {
  _eventsMemCache = events; // update memory immediately — reads are instant after this
  await chrome.storage.local.set({ [GCAL_CACHE_KEY]: events }); // eslint-disable-line no-undef
  localStorage.setItem(GCAL_HAS_CACHE_FLAG, '1');
}

/** Clear the cache (used on disconnect). */
export async function clearGcalCache() {
  _eventsMemCache = [];
  await chrome.storage.local.remove(GCAL_CACHE_KEY); // eslint-disable-line no-undef
  localStorage.removeItem(GCAL_HAS_CACHE_FLAG);
  localStorage.removeItem(GCAL_SYNCED_AT_KEY);
}

// ─── Profile cache ────────────────────────────────────────────────────────────

const PROFILE_CACHE_KEY = 'gcal_profile_cache';

// Module-level memory cache for the Google profile.
let _profileMemCache = undefined; // undefined = not yet loaded, null = loaded but empty

export async function loadCachedProfile() {
  if (_profileMemCache !== undefined) return _profileMemCache;

  // One-time migration from old localStorage copy.
  const legacyRaw = localStorage.getItem(PROFILE_CACHE_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (legacy) {
        await chrome.storage.local.set({ [PROFILE_CACHE_KEY]: legacy }); // eslint-disable-line no-undef
      }
    } catch { /* ignore */ }
    localStorage.removeItem(PROFILE_CACHE_KEY);
  }

  const result = await chrome.storage.local.get(PROFILE_CACHE_KEY); // eslint-disable-line no-undef
  _profileMemCache = result[PROFILE_CACHE_KEY] ?? null;
  return _profileMemCache;
}

async function saveProfileCache(profile) {
  _profileMemCache = profile;
  await chrome.storage.local.set({ [PROFILE_CACHE_KEY]: profile }); // eslint-disable-line no-undef
}

export async function clearProfileCache() {
  _profileMemCache = null;
  await chrome.storage.local.remove(PROFILE_CACHE_KEY); // eslint-disable-line no-undef
}

/**
 * Fetches the signed-in user's Google profile (name, email, picture).
 * Returns null on failure.
 */
export async function getGoogleProfile() {
  try {
    const token = await getGoogleAuthToken(false);
    if (!token) return null;
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const profile = {
      name: data.name || '',
      email: data.email || '',
      picture: data.picture || null,
    };
    saveProfileCache(profile);
    return profile;
  } catch {
    return null;
  }
}

// ─── API call ────────────────────────────────────────────────────────────────
async function fetchEventsWithToken(token) {
  const params = new URLSearchParams({
    maxResults: '32',
    orderBy: 'startTime',
    singleEvents: 'true',
    timeMin: new Date().toISOString(),
  });

  const res = await fetch(`${CALENDAR_API}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 401) throw new Error('TOKEN_EXPIRED');
  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status} ${res.statusText}`);

  const data = await res.json();

  return (data.items || []).filter((e) => e.eventType === 'default').map((e) => ({
    id: `gcal_${e.id}`,
    title: e.summary || '(No title)',
    description: e.description || '',
    startDate: (e.start?.dateTime || e.start?.date || '').slice(0, 10),
    startTime: e.start?.dateTime ? e.start.dateTime.slice(11, 16) : '',
    endDate: (e.end?.dateTime || e.end?.date || '').slice(0, 10),
    endTime: e.end?.dateTime ? e.end.dateTime.slice(11, 16) : '',
    htmlLink: e.htmlLink || null,
    meetLink: e.hangoutLink || null,
    _source: 'gcal',
  }));
}

/** Returns fetched events and whether the set of IDs changed vs the cache. */
export async function getCalendarEvents() {
  let token;
  try {
    token = await getGoogleAuthToken(true);
    const fresh = await fetchEventsWithToken(token);
    const cached = await loadCachedGcalEvents();
    const cachedIds = new Set(cached.map(e => e.id));
    const freshIds = new Set(fresh.map(e => e.id));
    const changed = fresh.length !== cached.length ||
      fresh.some(e => !cachedIds.has(e.id)) ||
      cached.some(e => !freshIds.has(e.id));
    if (changed) await saveCachedGcalEvents(fresh);
    clearDisconnectedFlag();
    saveGcalSyncedAt();
    return { events: fresh, changed };
  } catch (err) {
    if (err.message === 'TOKEN_EXPIRED' && token) {
      await removeGoogleAuthToken(token);
      try {
        const freshToken = await getGoogleAuthToken(true);
        const fresh = await fetchEventsWithToken(freshToken);
        await saveCachedGcalEvents(fresh);
        return { events: fresh, changed: true };
      } catch (retryErr) {
        console.warn('[GoogleCalendar] Retry failed:', retryErr.message);
        throw retryErr; // propagate so callers can show error
      }
    }
    console.warn('[GoogleCalendar]', err.message);
    throw err; // propagate — callers decide whether to use stale cache
  }
}

/**
 * Silent check — true if the user has already granted consent.
 * Returns false immediately if the user previously explicitly disconnected.
 * Does NOT show a consent prompt.
 */
export async function isCalendarConnected() {
  if (isDisconnected()) return false;
  try {
    const token = await getGoogleAuthToken(false);
    return !!token;
  } catch {
    return false;
  }
}

/**
 * Revoke and remove the cached OAuth token (effectively "disconnect").
 * Sets a persistent flag so the extension does not silently re-connect on reload.
 */
export async function disconnectCalendar() {
  const token = await getGoogleAuthToken(false).catch(() => null);
  if (token) await removeGoogleAuthToken(token);
  clearGcalCache();
  clearProfileCache();
  setDisconnectedFlag();
}
