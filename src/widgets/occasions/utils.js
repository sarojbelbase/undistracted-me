/**
 * Birthdays widget utilities
 */

// ─── Date helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the next calendar occurrence of a month/day as a JS Date.
 * If the date has already passed this year, returns next year's date.
 */
export const nextOccurrence = (month, day) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const candidate = new Date(now.getFullYear(), month - 1, day);
  if (candidate >= today) return candidate;
  return new Date(now.getFullYear() + 1, month - 1, day);
};

/**
 * Days from today (midnight) to a target Date. Always >= 0.
 */
export const daysAway = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(date);
  target.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((target - today) / 86_400_000));
};

/**
 * Enriches a raw cache entry { id, name, type, month, day }
 * with live computed fields: nextDate, daysAway.
 */
export const enrich = (entry) => {
  const next = nextOccurrence(entry.month, entry.day);
  return { ...entry, nextDate: next, daysAway: daysAway(next) };
};

/**
 * Sorts and slices a raw entries array into a max-3 upcoming list.
 * Returns enriched entries sorted by daysAway ascending.
 * Deduplicates by (name, type, month, day) — keeping the soonest occurrence
 * (handles overlap between Google Contacts and manual entries).
 */
export const computeUpcoming = (raw) => {
  const seen = new Set();
  return raw
    .map(enrich)
    .filter(e => e.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)
    .filter(e => {
      const key = `${e.name.toLowerCase()}|${e.type}|${e.month}|${e.day}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 3);
};

// ─── Display helpers ──────────────────────────────────────────────────────────

/**
 * Human-readable "days away" label.
 */
export const daysLabel = (n) => {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `in ${n}d`;
  if (n < 31) return `in ${Math.round(n / 7)}w`;
  return `in ${Math.round(n / 30)}mo`;
};

export const typeLabel = (type) => {
  if (type === 'anniversary') return 'Anniversary';
  if (type === 'other') return 'Special day';
  return 'Birthday';
};

/**
 * Left-bar / chip urgency color based on days remaining.
 * Today → accent; within week → slightly muted; further → border color.
 */
export const urgencyColor = (n) => {
  if (n === 0) return 'var(--w-accent)';
  if (n <= 7) return 'var(--w-accent)';
  if (n <= 30) return 'var(--w-ink-5)';
  return 'var(--w-border)';
};

// ─── Avatar color ─────────────────────────────────────────────────────────────

// Warm, earthy palette that reads well on #fff surface
const AVATAR_PALETTE = [
  { bg: '#fde9e9', fg: '#c0392b' }, // warm red
  { bg: '#fef0e0', fg: '#c0732b' }, // peach
  { bg: '#fef9e0', fg: '#b08800' }, // amber
  { bg: '#e6f9f0', fg: '#1e8c5a' }, // teal green
  { bg: '#e8f4fd', fg: '#1a6aa0' }, // sky blue
  { bg: '#ede8fd', fg: '#5b3db8' }, // violet
  { bg: '#fde8f9', fg: '#a0359c' }, // rose
  { bg: '#f0f0f0', fg: '#555555' }, // neutral gray
];

export const avatarColor = (name) => {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};

/** First letter of the first word, uppercase. */
export const avatarLetter = (name) => (name || '?')[0].toUpperCase();

// ─── Age formatting ───────────────────────────────────────────────────────────
// Sourced from utilities/index.js — single canonical implementation.
export { humanizeAge } from '../../utilities';
