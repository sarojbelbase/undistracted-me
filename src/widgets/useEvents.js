import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'widget_events';
const SYNC_EVENT = 'widget_events_changed';

const load = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const save = (events) => localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

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

// Today's date string in YYYY-MM-DD
export const todayStr = () => new Date().toISOString().slice(0, 10);
