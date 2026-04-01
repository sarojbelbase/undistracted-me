/**
 * Events widget utilities
 */

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Today's date string in YYYY-MM-DD */
export const todayStr = () => new Date().toISOString().slice(0, 10);

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

/** Format a timestamp (ms) as a human-readable age string, e.g. "synced 3m ago". */
export const humanizeAge = (ts) => {
  if (!ts) return null;
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 30) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

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
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};
