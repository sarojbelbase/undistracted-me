import { useState, useEffect, useCallback, useRef } from 'react';
import { getCalendarEvents, isCalendarConnected, loadCachedGcalEvents, getGoogleProfile, loadCachedProfile, loadGcalSyncedAt } from '../utilities/googleCalendar';

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
    cache = [...cache, { ...event, id: Date.now() }];
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
export const useGoogleCalendar = () => {
  const [gcalEvents, setGcalEvents] = useState(() => loadCachedGcalEvents());
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(() => loadCachedGcalEvents().length > 0);
  const [syncedAt, setSyncedAt] = useState(() => loadGcalSyncedAt());
  const fetchedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { events, changed } = await getCalendarEvents();
      setConnected(true);
      setSyncedAt(loadGcalSyncedAt());
      if (changed) setGcalEvents(events);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const cached = loadCachedGcalEvents();
    if (cached.length > 0) {
      // Already have cached data — refresh in background so data is fresh
      setConnected(true);
      refresh();
      return;
    }
    // No cache — silently check if already connected before prompting
    isCalendarConnected().then((yes) => {
      setConnected(yes);
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

  return { gcalEvents, loading, connected, syncedAt, refresh };
};

/**
 * Returns the signed-in Google user's profile { name, email, picture }.
 * Loads from cache instantly, revalidates in the background.
 */
export const useGoogleProfile = () => {
  const [profile, setProfile] = useState(() => loadCachedProfile());

  useEffect(() => {
    getGoogleProfile().then(p => { if (p) setProfile(p); });
  }, []);

  return profile;
};
