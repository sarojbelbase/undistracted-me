/**
 * Google People API — contacts birthdays & anniversaries
 *
 * Uses the same chrome.identity OAuth flow as googleCalendar.js.
 * Required manifest scope: https://www.googleapis.com/auth/contacts.readonly
 *
 * Cache shape (raw, no daysAway — computed at render time):
 *   [{ id, name, type, month, day }]
 *
 * `type` is one of: 'birthday' | 'anniversary' | 'other'
 */

const PEOPLE_API = 'https://people.googleapis.com/v1/people/me/connections';
const CACHE_KEY = 'contacts_birthdays_cache';
const SYNCED_KEY = 'contacts_birthdays_synced_at';

// ─── Auth helpers (mirrors googleCalendar.js) ────────────────────────────────

function isChromeIdentityAvailable() {
  return typeof chrome !== 'undefined' && !!chrome.identity;
}

async function getAuthToken(interactive = true) {
  if (!isChromeIdentityAvailable()) {
    throw new Error('chrome.identity is not available');
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

export function loadCachedContacts() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function loadContactsSyncedAt() {
  const v = localStorage.getItem(SYNCED_KEY);
  return v ? Number(v) : null;
}

function saveCachedContacts(entries) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
    localStorage.setItem(SYNCED_KEY, String(Date.now()));
  } catch { /* storage full — ignore */ }
}

export function clearContactsCache() {
  localStorage.removeItem(CACHE_KEY);
  localStorage.removeItem(SYNCED_KEY);
}

// ─── People API fetch ────────────────────────────────────────────────────────

/**
 * Fetches all connections (contacts) with birthday/anniversary data.
 * Handles pagination (up to 2000 contacts).
 */
async function fetchAllConnections(token) {
  const all = [];
  let pageToken;

  do {
    const params = new URLSearchParams({
      personFields: 'names,birthdays,events',
      pageSize: '200',
      sortOrder: 'FIRST_NAME_ASCENDING',
      ...(pageToken ? { pageToken } : {}),
    });

    const res = await fetch(`${PEOPLE_API}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) throw new Error('TOKEN_EXPIRED');
    if (res.status === 403) {
      const body = await res.json().catch(() => ({}));
      const reason = body?.error?.details?.find?.(d => d.reason)?.reason || '';
      if (reason === 'SERVICE_DISABLED') throw new Error('SERVICE_DISABLED');
      throw new Error('SCOPE_INSUFFICIENT');
    }
    if (!res.ok) throw new Error(`People API error: ${res.status}`);

    const data = await res.json();
    (data.connections || []).forEach(c => all.push(c));
    pageToken = data.nextPageToken;
  } while (pageToken && all.length < 2000);

  return all;
}

/**
 * Parses raw People API contacts into a flat list of date entries.
 * Each entry: { id, name, type, month, day }
 * Deduplicates by (name, type, month, day) — handles contacts synced from
 * multiple sources (iCloud + Google) that store the same birthday twice.
 */
function parseContacts(connections) {
  const raw = [];

  connections.forEach((person) => {
    const name = person.names?.[0]?.displayName;
    if (!name) return;

    const resourceName = person.resourceName || `unknown_${Math.random()}`;

    // Birthdays
    (person.birthdays || []).forEach((b, i) => {
      const { month, day } = b.date || {};
      if (month && day) {
        raw.push({
          id: `${resourceName}_birthday_${i}`,
          name,
          type: 'birthday',
          month: Number(month),
          day: Number(day),
        });
      }
    });

    // Custom events (anniversary, etc.)
    (person.events || []).forEach((ev, i) => {
      const { month, day } = ev.date || {};
      if (!month || !day) return;
      const rawType = (ev.type || '').toLowerCase();
      const type = rawType === 'anniversary' ? 'anniversary' : 'other';
      raw.push({
        id: `${resourceName}_event_${i}`,
        name,
        type,
        month: Number(month),
        day: Number(day),
      });
    });
  });

  // Deduplicate by (name, type, month, day) — keep first occurrence
  const seen = new Set();
  return raw.filter(e => {
    const key = `${e.name}|${e.type}|${e.month}|${e.day}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Fetches contacts from Google People API and caches them.
 * Returns the processed entries array.
 *
 * @param {boolean} interactive — whether to show the consent prompt
 */
export async function getContactBirthdays(interactive = true) {
  let token;
  try {
    token = await getAuthToken(interactive);
    const connections = await fetchAllConnections(token);
    const entries = parseContacts(connections);
    saveCachedContacts(entries);
    return entries;
  } catch (err) {
    // SERVICE_DISABLED: People API not enabled in GCP — don't retry, propagate immediately
    if (err.message === 'SERVICE_DISABLED') throw err;
    // TOKEN_EXPIRED / SCOPE_INSUFFICIENT: remove stale token and force re-auth
    if ((err.message === 'TOKEN_EXPIRED' || err.message === 'SCOPE_INSUFFICIENT') && token) {
      await removeCachedToken(token);
      try {
        const freshToken = await getAuthToken(interactive);
        const connections = await fetchAllConnections(freshToken);
        const entries = parseContacts(connections);
        saveCachedContacts(entries);
        return entries;
      } catch (retryErr) {
        console.warn('[GoogleContacts] Retry failed:', retryErr.message);
        return loadCachedContacts();
      }
    }
    // User denied or other error — rethrow for the widget to handle
    throw err;
  }
}

/**
 * Silent check — true if the user has already granted consent and has cached data.
 */
export function isContactsConnected() {
  return loadCachedContacts().length > 0;
}

/**
 * Removes the cached contacts data (does NOT revoke the OAuth token — shared with Calendar).
 */
export function disconnectContacts() {
  clearContactsCache();
}

// ─── Manual birthdays ─────────────────────────────────────────────────────────

const MANUAL_KEY = 'birthdays_manual';

export function loadManualBirthdays() {
  try { return JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]'); }
  catch { return []; }
}

function saveManualBirthdays(arr) {
  try { localStorage.setItem(MANUAL_KEY, JSON.stringify(arr)); }
  catch { /* storage full */ }
}

export function addManualBirthday(name, type, month, day) {
  const arr = loadManualBirthdays();
  const entry = { id: `manual_${Date.now()}`, name, type, month, day, _source: 'manual' };
  saveManualBirthdays([...arr, entry]);
  return entry;
}

export function removeManualBirthday(id) {
  saveManualBirthdays(loadManualBirthdays().filter(e => e.id !== id));
}
