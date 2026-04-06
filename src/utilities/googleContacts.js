/**
 * Google People API — contacts birthdays & anniversaries
 *
 * Auth is handled by googleAuth.js which works on both Chrome and Firefox.
 */
import { getGoogleAuthToken, removeGoogleAuthToken } from './googleAuth';

const PEOPLE_API = 'https://people.googleapis.com/v1/people/me/connections';
const CACHE_KEY = 'contacts_birthdays_cache';
const SYNCED_KEY = 'contacts_birthdays_synced_at';
const DISCONNECTED_KEY = 'contacts_disconnected';
// Non-sensitive boolean flag in localStorage so isContactsConnected() stays synchronous.
const HAS_CACHE_FLAG = 'contacts_has_cache';

// ─── Local cache ────────────────────────────────────────────────────────────

// Module-level memory cache — populated on first chrome.storage.local read.
// Updated synchronously on every write/clear so subsequent reads are instant.
let _contactsMemCache = null; // null = not yet loaded

export async function loadCachedContacts() {
  if (_contactsMemCache !== null) return _contactsMemCache;

  // One-time migration from old localStorage copy.
  const legacyRaw = localStorage.getItem(CACHE_KEY);
  if (legacyRaw) {
    try {
      const legacy = JSON.parse(legacyRaw);
      if (Array.isArray(legacy) && legacy.length > 0) {
        await chrome.storage.local.set({ [CACHE_KEY]: legacy }); // eslint-disable-line no-undef
        localStorage.setItem(HAS_CACHE_FLAG, '1');
      }
    } catch { /* ignore malformed data */ }
    localStorage.removeItem(CACHE_KEY);
  }

  const result = await chrome.storage.local.get(CACHE_KEY); // eslint-disable-line no-undef
  _contactsMemCache = result[CACHE_KEY] ?? [];
  return _contactsMemCache;
}

export function loadContactsSyncedAt() {
  const v = localStorage.getItem(SYNCED_KEY);
  return v ? Number(v) : null;
}

async function saveCachedContacts(entries) {
  _contactsMemCache = entries; // update memory immediately
  await chrome.storage.local.set({ [CACHE_KEY]: entries }); // eslint-disable-line no-undef
  localStorage.setItem(HAS_CACHE_FLAG, '1');
  localStorage.setItem(SYNCED_KEY, String(Date.now()));
}

export async function clearContactsCache() {
  _contactsMemCache = [];
  await chrome.storage.local.remove(CACHE_KEY); // eslint-disable-line no-undef
  localStorage.removeItem(HAS_CACHE_FLAG);
  localStorage.removeItem(SYNCED_KEY);
}

function isContactsDisconnected() {
  return localStorage.getItem(DISCONNECTED_KEY) === '1';
}

function setContactsDisconnectedFlag() {
  localStorage.setItem(DISCONNECTED_KEY, '1');
}

export function clearContactsDisconnectedFlag() {
  localStorage.removeItem(DISCONNECTED_KEY);
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
    token = await getGoogleAuthToken(interactive);
    const connections = await fetchAllConnections(token);
    const entries = parseContacts(connections);
    saveCachedContacts(entries);
    clearContactsDisconnectedFlag();
    return entries;
  } catch (err) {
    if (err.message === 'SERVICE_DISABLED') throw err;
    if ((err.message === 'TOKEN_EXPIRED' || err.message === 'SCOPE_INSUFFICIENT') && token) {
      await removeGoogleAuthToken(token);
      try {
        const freshToken = await getGoogleAuthToken(interactive);
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
 * Returns false immediately if the user previously explicitly disconnected.
 */
export function isContactsConnected() {
  if (isContactsDisconnected()) return false;
  return localStorage.getItem(HAS_CACHE_FLAG) === '1';
}

/**
 * Removes the cached contacts data and sets a disconnected flag so the extension
 * does not silently re-sync on the next reload.
 * Note: Contacts and Calendar share the same Google OAuth token — we don't revoke
 * the token here (that would log out Calendar too). The flag prevents re-syncing.
 */
export function disconnectContacts() {
  clearContactsCache();
  setContactsDisconnectedFlag();
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
