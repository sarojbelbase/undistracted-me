/**
 * humanizeTime — Single source of truth for all time-relative display.
 *
 * Every widget that shows "in 5 min", "2 years ago", "Next Week", etc.
 * MUST use this function. No more scattered humanizers.
 *
 * Usage:
 *   import { humanizeTime } from '../utilities/humanizeTime';
 *
 *   const h = humanizeTime(someDate, { time: '14:00', now: Date.now() });
 *   h.compact  // "14h", "2y", "Next Week"
 *   h.full     // "in 14 hours", "2 years ago", "next week"
 *   h.calendar // "Today", "Tomorrow", "Yesterday", "Next Week", etc.
 *
 * @param {Date|string} date  — target Date object or YYYY-MM-DD string
 * @param {object} [opts]
 * @param {string} [opts.time]  — "HH:MM" time component
 * @param {number} [opts.now]   — current timestamp for render consistency
 * @returns {{
 *   compact: string,    // list-item label: "14h", "2y", "Yesterday"
 *   full: string,       // widget face phrase: "in 14 hours", "2 years ago"
 *   calendar: string,   // calendar-relative: "Today", "Next Week", "last month"
 *   direction: 'future'|'past'|'present',
 *   isToday: boolean,
 *   isTomorrow: boolean,
 *   isYesterday: boolean,
 * }}
 */

// ─── Calendar helpers ─────────────────────────────────────────────────────────

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const diffDays = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);

const diffCalMonths = (a, b) =>
  (a.getFullYear() - b.getFullYear()) * 12 + (a.getMonth() - b.getMonth());

const diffCalYears = (a, b) => a.getFullYear() - b.getFullYear();

const sameCalendarDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

// ─── Tier helpers ────────────────────────────────────────────────────────────

function fmtMins(m) {
  return `${m}m`;
}

function fmtHours(h) {
  return `${h}h`;
}

function fmtDays(d) {
  return `${d}d`;
}

function fmtWeeks(w) {
  return `${w}w`;
}

function fmtMonths(m) {
  return `${m}mo`;
}

function fmtYears(y) {
  return `${y}y`;
}

function fullMins(m) {
  return `${m} min`;
}

function fullHours(h) {
  return `${h} ${h === 1 ? 'hour' : 'hours'}`;
}

function fullDays(d) {
  return `${d} ${d === 1 ? 'day' : 'days'}`;
}

function fullWeeks(w) {
  return `${w} ${w === 1 ? 'week' : 'weeks'}`;
}

function fullMonths(m) {
  return `${m} ${m === 1 ? 'month' : 'months'}`;
}

function fullYears(y) {
  return `${y} ${y === 1 ? 'year' : 'years'}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export function humanizeTime(date, opts = {}) {
  const now = opts.now !== undefined && opts.now !== null ? new Date(opts.now) : new Date();
  const target = typeof date === 'string'
    ? new Date(`${date}T${opts.time || '00:00'}`)
    : new Date(date);

  const days = diffDays(target, now);
  const isToday = sameCalendarDay(target, now);
  const isTomorrow = days === 1;
  const isYesterday = days === -1;

  let direction;
  if (days > 0) direction = 'future';
  else if (days < 0) direction = 'past';
  else direction = 'present';

  if (direction === 'present' || (direction === 'future' && target <= now)) {
    return { compact: 'now', full: 'now', calendar: 'Today', direction: 'present', isToday: true, isTomorrow: false, isYesterday: false };
  }

  if (direction === 'future') {
    const result = _humanizeFuture(target, now, days, isToday, isTomorrow);
    return { ...result, direction, isToday, isTomorrow, isYesterday };
  }
  const result = _humanizePast(target, now, days, isToday, isYesterday);
  return { ...result, direction, isToday, isTomorrow, isYesterday };
}

// ─── Future tiers ────────────────────────────────────────────────────────────

function _humanizeFuture(target, now, days, isToday, isTomorrow) {
  const absDays = Math.abs(days);
  const calMonths = Math.abs(diffCalMonths(target, now));
  const calYears = Math.abs(diffCalYears(target, now));

  if (isToday) return _futureToday(target, now);
  if (isTomorrow) return { compact: 'Tomorrow', full: 'tomorrow', calendar: 'Tomorrow' };
  if (absDays < 7) return _futureDays(absDays, target);
  if (absDays < 14 && _isNextWeek(target, now)) return { compact: 'Next Week', full: 'next week', calendar: 'Next Week' };
  if (absDays < 30) return _futureWeeks(absDays);
  if (calMonths === 0 && _isNextMonth(target, now)) return { compact: 'Next Month', full: 'next month', calendar: 'Next Month' };
  if (calMonths < 12) return _futureMonths(calMonths);
  if (calYears === 0 && _isNextYear(target, now)) return { compact: 'Next Year', full: 'next year', calendar: 'Next Year' };
  return _futureYears(calYears);
}

function _futureToday(target, now) {
  const diffMs = target - now;
  const totalMin = Math.ceil(diffMs / 60000);
  if (totalMin < 1) return { compact: '<1m', full: 'in <1 min', calendar: 'Today' };
  if (totalMin < 60) return { compact: fmtMins(totalMin), full: `in ${fullMins(totalMin)}`, calendar: 'Today' };
  const h = Math.floor(totalMin / 60);
  return { compact: fmtHours(h), full: `in ${fullHours(h)}`, calendar: 'Today' };
}

function _futureDays(absDays, target) {
  const cal = target.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return { compact: fmtDays(absDays), full: `in ${fullDays(absDays)}`, calendar: cal };
}

function _futureWeeks(absDays) {
  const w = Math.round(absDays / 7);
  return { compact: fmtWeeks(w), full: `in ${fullWeeks(w)}`, calendar: `in ${fullWeeks(w)}` };
}

function _futureMonths(m) {
  return { compact: fmtMonths(m), full: `in ${fullMonths(m)}`, calendar: `in ${fullMonths(m)}` };
}

function _futureYears(y) {
  return { compact: fmtYears(y), full: `in ${fullYears(y)}`, calendar: `in ${fullYears(y)}` };
}

// ─── Past tiers ──────────────────────────────────────────────────────────────

function _humanizePast(target, now, days, isToday, isYesterday) {
  const absDays = Math.abs(days);
  const diffMs = now - target;
  const totalMin = Math.floor(diffMs / 60000);
  const totalHrs = Math.floor(totalMin / 60);
  const calMonths = Math.abs(diffCalMonths(target, now));
  const calYears = Math.abs(diffCalYears(target, now));

  if (totalMin < 1) return { compact: 'just now', full: 'just now', calendar: 'Today' };
  if (totalMin < 60) return { compact: `${fmtMins(totalMin)} ago`, full: `${fullMins(totalMin)} ago`, calendar: 'Today' };
  if (isToday) return { compact: `${fmtHours(totalHrs)} ago`, full: `${fullHours(totalHrs)} ago`, calendar: 'Today' };
  if (isYesterday) return { compact: 'Yesterday', full: 'yesterday', calendar: 'Yesterday' };
  if (absDays < 7) return { compact: `${fmtDays(absDays)} ago`, full: `${fullDays(absDays)} ago`, calendar: `${fullDays(absDays)} ago` };
  if (absDays < 14) return { compact: '1w ago', full: 'last week', calendar: 'last week' };
  if (absDays < 30) return _pastWeeks(absDays);
  if (calMonths === 1) return { compact: '1mo ago', full: 'last month', calendar: 'last month' };
  if (calMonths < 12) return { compact: `${fmtMonths(calMonths)} ago`, full: `${fullMonths(calMonths)} ago`, calendar: `${fullMonths(calMonths)} ago` };
  if (calYears === 1) return { compact: '1y ago', full: 'last year', calendar: 'last year' };
  return { compact: `${fmtYears(calYears)} ago`, full: `${fullYears(calYears)} ago`, calendar: `${fullYears(calYears)} ago` };
}

function _pastWeeks(absDays) {
  const w = Math.round(absDays / 7);
  return { compact: `${fmtWeeks(w)} ago`, full: `${fullWeeks(w)} ago`, calendar: `${fullWeeks(w)} ago` };
}

// ─── Calendar boundary helpers ────────────────────────────────────────────────

function _isNextWeek(target, now) {
  const startOfNextWeek = new Date(now);
  startOfNextWeek.setDate(now.getDate() + (7 - now.getDay() || 7));
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
  return target >= startOfNextWeek && target < endOfNextWeek;
}

function _isNextMonth(target, now) {
  const startOfNext = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const endOfNext = new Date(now.getFullYear(), now.getMonth() + 2, 1);
  return target >= startOfNext && target < endOfNext;
}

function _isNextYear(target, now) {
  const startOfNext = new Date(now.getFullYear() + 1, 0, 1);
  const endOfNext = new Date(now.getFullYear() + 2, 0, 1);
  return target >= startOfNext && target < endOfNext;
}
