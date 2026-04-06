/**
 * Google Calendar OAuth2 + API utilities
 *
 * Prerequisites:
 *   1. manifest.json must have "identity" permission + "oauth2" block with client_id
 *   2. Google Calendar API must be enabled in Google Cloud Console
 *   3. OAuth2 client must be of type "Chrome App" with your extension ID
 */

const CALENDAR_API =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// ─── Auth helpers ────────────────────────────────────────────────────────────

function isChromeIdentityAvailable() {
  return typeof chrome !== 'undefined' && !!chrome.identity;
}

async function getAuthToken(interactive = true) {
  if (!isChromeIdentityAvailable()) {
    throw new Error('chrome.identity is not available (non-extension context)');
  }
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => { // eslint-disable-line no-undef
      if (chrome.runtime.lastError) { // eslint-disable-line no-undef
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(token);
      }
    });
  });
}

async function removeCachedToken(token) {
  if (!isChromeIdentityAvailable()) return;
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, resolve); // eslint-disable-line no-undef
  });
}

// ─── Local cache ────────────────────────────────────────────────────────────

const GCAL_CACHE_KEY = 'gcal_events_cache';
const GCAL_DISCONNECTED_KEY = 'gcal_disconnected';
const GCAL_SYNCED_AT_KEY = 'gcal_synced_at';

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

/** Load previously cached events synchronously (returns [] if none). */
export function loadCachedGcalEvents() {
  try {
    return JSON.parse(localStorage.getItem(GCAL_CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCachedGcalEvents(events) {
  try {
    localStorage.setItem(GCAL_CACHE_KEY, JSON.stringify(events));
  } catch { /* storage full — ignore */ }
}

/** Clear the cache (used on disconnect). */
export function clearGcalCache() {
  localStorage.removeItem(GCAL_CACHE_KEY);
  localStorage.removeItem(GCAL_SYNCED_AT_KEY);
}

// ─── Profile cache ────────────────────────────────────────────────────────────

const PROFILE_CACHE_KEY = 'gcal_profile_cache';

export function loadCachedProfile() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_CACHE_KEY) || 'null');
  } catch {
    return null;
  }
}

function saveProfileCache(profile) {
  try {
    localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
  } catch { /* ignore */ }
}

export function clearProfileCache() {
  localStorage.removeItem(PROFILE_CACHE_KEY);
}

/**
 * Fetches the signed-in user's Google profile (name, email, picture).
 * Returns null on failure.
 */
export async function getGoogleProfile() {
  try {
    const token = await getAuthToken(false);
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
    token = await getAuthToken(true);
    const fresh = await fetchEventsWithToken(token);
    const cached = loadCachedGcalEvents();
    const cachedIds = new Set(cached.map(e => e.id));
    const freshIds = new Set(fresh.map(e => e.id));
    const changed = fresh.length !== cached.length ||
      fresh.some(e => !cachedIds.has(e.id)) ||
      cached.some(e => !freshIds.has(e.id));
    if (changed) saveCachedGcalEvents(fresh);
    clearDisconnectedFlag();
    saveGcalSyncedAt();
    return { events: fresh, changed };
  } catch (err) {
    if (err.message === 'TOKEN_EXPIRED' && token) {
      await removeCachedToken(token);
      try {
        const freshToken = await getAuthToken(true);
        const fresh = await fetchEventsWithToken(freshToken);
        saveCachedGcalEvents(fresh);
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
    const token = await getAuthToken(false);
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
  const token = await getAuthToken(false).catch(() => null);
  if (token) await removeCachedToken(token);
  clearGcalCache();
  clearProfileCache();
  setDisconnectedFlag();
}
