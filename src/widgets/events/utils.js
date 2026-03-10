/**
 * Events widget utilities
 */

// ─── Date helpers ────────────────────────────────────────────────────────────

/** Today's date string in YYYY-MM-DD */
export const todayStr = () => new Date().toISOString().slice(0, 10);

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

/**
 * Returns className + style props for a pill button (active/inactive states).
 */
export const pill = (active) => ({
  className: 'px-3 py-1 text-xs rounded-full border transition-all',
  style: active
    ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)', borderColor: 'var(--w-accent)' }
    : { backgroundColor: 'var(--w-surface)', color: 'var(--w-ink-4)', borderColor: 'var(--w-ink-6)' },
});
