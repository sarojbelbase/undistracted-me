import { useState, useEffect, useCallback, useRef } from 'react';
import { getCalendarEvents, isCalendarConnected, loadCachedGcalEvents, hasCachedGcalEvents, getGoogleProfile, loadCachedProfile, loadGcalSyncedAt } from '../utilities/googleCalendar';

const STORAGE_KEY = 'widget_events';
const SYNC_EVENT = 'widget_events_changed';

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const save = (events) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  // Mirror to service worker so it can fire event reminders even when tab is closed
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    chrome.runtime.sendMessage({ type: 'EVENTS_UPDATED', events });
  }
};

// Module-level cache — shared across all useEvents instances so mutations are visible immediately
let cache = load();

const broadcast = () => window.dispatchEvent(new Event(SYNC_EVENT));

// Returns [events, addEvent, removeEvent] — all components stay in sync via SYNC_EVENT
export const useEvents = () => {
  // Use a counter to force re-renders; actual data lives in the module-level cache
  const [, rerender] = useState(0);

  useEffect(() => {
    const onSync = () => {
      cache = load();
      rerender(n => n + 1);
    };
    window.addEventListener(SYNC_EVENT, onSync);
    window.addEventListener('storage', onSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, onSync);
      window.removeEventListener('storage', onSync);
    };
  }, []);

  const addEvent = useCallback((event) => {
    // Preserve caller-provided id (e.g. from countdown widget mirror)
    cache = [...cache, { ...event, id: event.id ?? Date.now() }];
    save(cache);
    broadcast();
  }, []);

  const removeEvent = useCallback((id) => {
    cache = cache.filter(e => e.id !== id);
    save(cache);
    broadcast();
  }, []);

  return [cache, addEvent, removeEvent];
};

// event shape: { id, title, startDate, startTime, endDate, endTime }
// dates: 'YYYY-MM-DD', times: 'HH:MM' (24h)

export const formatEventTime = (event) => {
  const fmt = (date, time) => {
    if (!date) return null;
    const d = new Date(`${date}T${time || '00:00'}`);
    const h = d.getHours();
    const m = d.getMinutes();
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };
  const s = fmt(event.startDate, event.startTime);
  const e = fmt(event.endDate, event.endTime);
  if (s && e) return `${s} – ${e}`;
  if (s) return s;
  return '';
};

// Returns the JS Date of event start, or null
export const eventStartDate = (event) => {
  if (!event.startDate) return null;
  return new Date(`${event.startDate}T${event.startTime || '00:00'}`);
};

// ─── Google Calendar hook ────────────────────────────────────────────────────

/**
 * Fetches Google Calendar events and maps them to the internal event shape.
 * Returns { gcalEvents, loading, connected, refresh }.
 *
 * Usage:
 *   const { gcalEvents, loading, connected, refresh } = useGoogleCalendar();
 *
 * gcalEvents can be merged with local events:
 *   const allEvents = [...localEvents, ...gcalEvents];
 *
 * gcal events have _source: 'gcal' — treat them as read-only (no delete).
 */
// ─── Module-level GCal fetch singleton ──────────────────────────────────────
// Prevents multiple hook instances (Events widget, Focus Mode, etc.) from each
// triggering their own fetch and spamming identical requests / errors.
let _gcalInflight = null;          // in-flight Promise<{events,changed}> | null
let _gcalListeners = [];           // callbacks waiting on the same fetch

const fetchCalendarOnce = () => {
  if (_gcalInflight) return _gcalInflight;
  _gcalInflight = getCalendarEvents()
    .then(result => { _gcalListeners.forEach(cb => cb(null, result)); return result; })
    .catch(err => { _gcalListeners.forEach(cb => cb(err, null)); throw err; })
    .finally(() => { _gcalInflight = null; _gcalListeners = []; });
  return _gcalInflight;
};

export const useGoogleCalendar = () => {
  const [gcalEvents, setGcalEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  // hasCachedGcalEvents() is synchronous — reads a non-PII localStorage flag.
  const [connected, setConnected] = useState(() => hasCachedGcalEvents());
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(() => loadGcalSyncedAt());
  const fetchedRef = useRef(false);

  // Load cached events from chrome.storage.local on mount (async).
  useEffect(() => {
    loadCachedGcalEvents().then(cached => {
      if (cached.length > 0) setGcalEvents(cached);
    });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { events, changed } = await fetchCalendarOnce();
      setConnected(true);
      setError(null);
      setSyncedAt(loadGcalSyncedAt());
      if (changed) setGcalEvents(events);
    } catch (err) {
      const cached = await loadCachedGcalEvents();
      if (cached.length > 0) {
        // Previously established connection — keep connected with stale data, don't alarm
        setConnected(true);
      } else {
        // Never successfully fetched calendar data — stay/go disconnected and show error
        setConnected(false);
        setError(
          err.message?.includes('403') || err.message?.includes('SERVICE_DISABLED')
            ? 'Calendar API not enabled. Check your Google Cloud Console.'
            : 'Could not connect. Try again.'
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    if (hasCachedGcalEvents()) {
      // Already have cached data — refresh in background so data is fresh
      setConnected(true);
      refresh();
      return;
    }
    // No cache — silently check if already connected before prompting.
    // Do NOT set connected=true based on token alone — only a successful fetch confirms it.
    isCalendarConnected().then((yes) => {
      if (yes) refresh();
    });
  }, [refresh]);

  // Auto-refresh every hour so calendar stays in sync
  useEffect(() => {
    const tid = setInterval(() => {
      if (connected) refresh();
    }, 60 * 60 * 1000);
    return () => clearInterval(tid);
  }, [connected, refresh]);

  return { gcalEvents, loading, connected, error, syncedAt, refresh };
};

/**
 * Returns the signed-in Google user's profile { name, email, picture }.
 * Loads from cache instantly, revalidates in the background.
 */
export const useGoogleProfile = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    // Load cached profile from chrome.storage.local, then revalidate in background.
    loadCachedProfile().then(p => { if (p) setProfile(p); });
    getGoogleProfile().then(p => { if (p) setProfile(p); });
  }, []);

  return profile;
};
