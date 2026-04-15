/**
 * Canonical hook location: src/hooks/useEvents.js
 *
 * Shared hooks for the local event store and Google Calendar integration.
 * See widgets/useEvents.js (re-export stub) for historical context.
 */
import { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import {
  getCalendarEvents,
  isCalendarConnected,
  loadCachedGcalEvents,
  hasCachedGcalEvents,
  getGoogleProfile,
  loadCachedProfile,
  loadGcalSyncedAt,
} from '../utilities/googleCalendar';
import { sendToServiceWorker } from '../utilities/chrome';
import { STORAGE_KEYS } from '../constants/storageKeys';

const STORAGE_KEY = STORAGE_KEYS.EVENTS;
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
  sendToServiceWorker({ type: 'EVENTS_UPDATED', events });
};

// Module-level cache — shared across all useEvents instances so mutations are visible immediately
let cache = load();

const broadcast = () => globalThis.dispatchEvent(new Event(SYNC_EVENT));

// Returns [events, addEvent, removeEvent] — all components stay in sync via SYNC_EVENT
export const useEvents = () => {
  const [, forceRerender] = useReducer((c) => c + 1, 0);

  useEffect(() => {
    const onSync = () => {
      cache = load();
      forceRerender();
    };
    globalThis.addEventListener(SYNC_EVENT, onSync);
    globalThis.addEventListener('storage', onSync);
    return () => {
      globalThis.removeEventListener(SYNC_EVENT, onSync);
      globalThis.removeEventListener('storage', onSync);
    };
  }, []);

  const addEvent = useCallback((event) => {
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

export const eventStartDate = (event) => {
  if (!event.startDate) return null;
  return new Date(`${event.startDate}T${event.startTime || '00:00'}`);
};

// ─── Google Calendar hook ────────────────────────────────────────────────────

// Module-level in-flight dedup: if multiple hook instances call fetchCalendarOnce()
// concurrently they all await the same Promise rather than firing duplicate requests.
let _gcalInflight = null;

const fetchCalendarOnce = () => {
  if (_gcalInflight) return _gcalInflight;
  _gcalInflight = getCalendarEvents().finally(() => { _gcalInflight = null; });
  return _gcalInflight;
};

export const useGoogleCalendar = () => {
  const [gcalEvents, setGcalEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(() => hasCachedGcalEvents());
  const [error, setError] = useState(null);
  const [syncedAt, setSyncedAt] = useState(() => loadGcalSyncedAt());
  const fetchedRef = useRef(false);

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
        setConnected(true);
      } else {
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
      setConnected(true);
      refresh();
      return;
    }
    isCalendarConnected().then((yes) => {
      if (yes) refresh();
    });
  }, [refresh]);

  useEffect(() => {
    const tid = setInterval(() => {
      if (connected) refresh();
    }, 60 * 60 * 1000);
    return () => clearInterval(tid);
  }, [connected, refresh]);

  return { gcalEvents, loading, connected, error, syncedAt, refresh };
};

export const useGoogleProfile = () => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    loadCachedProfile().then(p => { if (p) setProfile(p); });
    getGoogleProfile().then(p => { if (p) setProfile(p); });
  }, []);

  return profile;
};
