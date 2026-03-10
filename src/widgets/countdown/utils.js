/**
 * Countdown widget utilities
 */
import { eventStartDate } from '../useEvents';

/**
 * Formats a Date as "H:MM AM/PM".
 */
export const fmt12h = (date) => {
  if (!date) return '';
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/**
 * Returns minutes remaining until the target Date (min 0).
 */
export const getMinutesLeft = (target) =>
  Math.max(0, Math.floor((target - new Date()) / 60_000));

/**
 * Finds the nearest upcoming event (start > now).
 * Attaches a `_start` Date to each event via eventStartDate().
 */
export const getNextEvent = (events) => {
  const now = new Date();
  return events
    .map(e => ({ ...e, _start: eventStartDate(e) }))
    .filter(e => e._start && e._start > now)
    .sort((a, b) => a._start - b._start)[0] || null;
};
