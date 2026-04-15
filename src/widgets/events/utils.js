/**
 * Events widget utilities
 */
import { todayStr } from '../../utilities';

// Re-export so existing widget-local imports keep working transparently.
export { todayStr } from '../../utilities';

/** Returns true if an event is in the past */
export const isPast = (event) => {
  const now = new Date();
  if (event.endDate && event.endTime) {
    return new Date(`${event.endDate}T${event.endTime}`) < now;
  }
  if (event.startDate && event.startTime) {
    return new Date(`${event.startDate}T${event.startTime}`) < now;
  }
  if (event.startDate) {
    return event.startDate < todayStr();
  }
  return false;
};

/** Date string offset from today (offset=1 → tomorrow) */
export const getDateOffset = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};

/**
 * Bucket label for a given date string.
 * @returns {'Today'|'Tomorrow'|'Later'|'Past'}
 */
export const bucketLabel = (dateStr) => {
  const today = todayStr();
  const tomorrow = getDateOffset(1);
  if (!dateStr || dateStr === today) return 'Today';
  if (dateStr === tomorrow) return 'Tomorrow';
  if (dateStr > today) return 'Later';
  return 'Past';
};

/**
 * Groups an array of events into { Today, Tomorrow, Later, Past }.
 */
export const groupEventsByBucket = (events) => {
  const buckets = { Today: [], Tomorrow: [], Later: [], Past: [] };
  events.forEach((e) => { buckets[bucketLabel(e.startDate)].push(e); });
  return buckets;
};

// ─── Age label ───────────────────────────────────────────────────────────────
// Sourced from utilities/index.js — single canonical implementation.
export { humanizeAge } from '../../utilities';

// ─── Layout constants ────────────────────────────────────────────────────────

export const ITEM_HEIGHT = 57;
export const HEADER_H = 40;
export const FOOTER_H = 52;

// ─── Form constants ──────────────────────────────────────────────────────────

export const EMPTY_FORM = { title: '', startDate: '', startTime: '', endDate: '', endTime: '' };

export const DATE_CHIPS = [
  { label: 'Today', key: 'today', offset: 0 },
  { label: 'Tomorrow', key: 'tomorrow', offset: 1 },
  { label: 'Custom', key: 'custom', offset: null },
];

export const DURATION_PILLS = [
  { label: '30 min', mins: 30 },
  { label: '1 hr', mins: 60 },
  { label: '2 hr', mins: 120 },
  { label: 'Custom', mins: null },
];

// ─── Form helpers ────────────────────────────────────────────────────────────

/**
 * Applies a duration (minutes) to a start datetime and returns the end datetime.
 */
export const applyDuration = (startDate, startTime, mins) => {
  if (!startDate || !startTime) return { endDate: startDate || '', endTime: '' };
  const d = new Date(`${startDate}T${startTime}`);
  d.setMinutes(d.getMinutes() + mins);
  return {
    endDate: d.toISOString().slice(0, 10),
    endTime: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
  };
};

// ─── Display formatters (shared by Widget + AllEventsModal) ──────────────────

/** "8:15 AM" from a 24-hour HH:MM string */
export const fmt12 = (time) => {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
};

/** "45 min" / "1h 30m" from start+end HH:MM; null if multi-day or indeterminate */
export const calcDuration = (startTime, endTime, startDate, endDate) => {
  if (!startTime || !endTime) return null;
  if (endDate && startDate && endDate !== startDate) return null;
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff <= 0 || diff > 1440) return null;
  if (diff < 60) return `${diff} min`;
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
};

/** Today → null; Tomorrow → 'Tomorrow'; else 'Fri, Apr 3' */
export const datePrefixFor = (dateStr) => {
  if (!dateStr) return null;
  const bucket = bucketLabel(dateStr);
  if (bucket === 'Today') return null;
  if (bucket === 'Tomorrow') return 'Tomorrow';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  const diffDays = Math.round((target - today) / 86400000);

  // Start/end of each relative boundary (Monday of next week, 1st of next month, etc.)
  const startOfNextWeek = new Date(today);
  startOfNextWeek.setDate(today.getDate() + (7 - today.getDay() || 7));
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);

  const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 1);

  const startOfNextYear = new Date(today.getFullYear() + 1, 0, 1);
  const endOfNextYear = new Date(today.getFullYear() + 2, 0, 1);

  if (target >= startOfNextYear) {
    if (target < endOfNextYear) return 'Next Year';
    const years = target.getFullYear() - today.getFullYear();
    return `in ${years} years`;
  }
  if (target >= startOfNextMonth) {
    if (target < endOfNextMonth) return 'Next Month';
    const months = (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth());
    return `in ${months} months`;
  }
  if (target >= startOfNextWeek) {
    if (target < endOfNextWeek) return 'Next Week';
    const weeks = Math.floor(diffDays / 7);
    return `in ${weeks} weeks`;
  }

  // Same week but not today/tomorrow — fall back to short date
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

/**
 * Returns true if an event is currently in progress (started but not yet ended).
 */
export const isLiveNow = (event) => {
  const now = new Date();
  const today = todayStr();
  const eDate = event.startDate || today;
  if (eDate !== today) return false;
  if (!event.startTime) return false;
  const start = new Date(`${eDate}T${event.startTime}`);
  if (now < start) return false;
  if (event.endTime) {
    const end = new Date(`${event.endDate || eDate}T${event.endTime}`);
    return now < end;
  }
  // No end time — treat the event as live for 30 min after start
  return (now - start) < 30 * 60 * 1000;
};
