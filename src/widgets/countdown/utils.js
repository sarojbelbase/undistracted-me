/**
 * Countdown widget utilities — dual-mode (countdown + since).
 */

export const REPEAT_OPTIONS = [
  { label: 'Once', value: 'none' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
];

export const MODE_OPTIONS = [
  { label: 'Countdown', value: 'countdown' },
  { label: 'Since', value: 'since' },
];

/**
 * Returns the next future occurrence of a countdown.
 * For 'none' repeat, returns the target Date as-is (may be in the past).
 * For repeating countdowns, advances until the next future occurrence.
 */
export const getNextOccurrence = ({ targetDate, targetTime, repeat }) => {
  const base = new Date(`${targetDate}T${targetTime || '00:00'}`);
  if (!repeat || repeat === 'none') return base;

  const now = new Date();
  if (base > now) return base;

  let next = new Date(base);
  while (next <= now) {
    if (repeat === 'weekly') next.setDate(next.getDate() + 7);
    else if (repeat === 'monthly') next.setMonth(next.getMonth() + 1);
    else if (repeat === 'yearly') next.setFullYear(next.getFullYear() + 1);
    else break;
  }
  return next;
};

/**
 * Returns { days, hours, minutes, totalSeconds } remaining until a target Date (min 0).
 * Uses Math.ceil so "1 second remaining" still shows as 1 minute, not 0.
 */
export const formatCountdown = (targetDate) => {
  const now = new Date();
  const diffMs = Math.max(0, targetDate - now);
  const totalSeconds = Math.ceil(diffMs / 1_000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return { days, hours, minutes, totalSeconds };
};

/**
 * Returns time elapsed SINCE a past date.
 * { days, months, years, totalSeconds } — all >= 0.
 */
export const formatSince = (targetDate) => {
  const now = new Date();
  const diffMs = Math.max(0, now - targetDate);
  const totalSeconds = Math.floor(diffMs / 1_000);
  const days = Math.floor(totalSeconds / 86400);
  const months = Math.floor(days / 30.44); // average month
  const years = Math.floor(days / 365.25); // average year (leap-aware)
  return { days, months, years, totalSeconds };
};

/**
 * Formats a Date as "Jan 1, 2026".
 */
export const formatTargetDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

/**
 * Formats a countdown value for the widget face phrase.
 * e.g. "50 min", "2 hours", "3 days", "2 weeks", "5 months", "1 year"
 */
function fmtMonths(days) {
  const m = Math.floor(days / 30);
  const r = days % 30 >= 15 ? m + 1 : m;
  return `${r} ${r === 1 ? 'month' : 'months'}`;
}

function fmtWeeksFromDays(totalDays) {
  const w = Math.floor(totalDays / 7);
  const r = totalDays % 7 >= 4 ? w + 1 : w;
  if (r >= 4) return '1 month';
  return `${r} ${r === 1 ? 'week' : 'weeks'}`;
}

function fmtDays(days, hours) {
  const r = hours >= 12 ? days + 1 : days;
  if (r >= 30) return '1 month';
  if (r >= 7) return fmtWeeksFromDays(r);
  return `${r} ${r === 1 ? 'day' : 'days'}`;
}

function fmtHours(hours, mins) {
  const r = mins >= 30 ? hours + 1 : hours;
  if (r >= 24) return '1 day';
  return `${r} ${r === 1 ? 'hour' : 'hours'}`;
}

function fmtMins(mins, secs) {
  const r = secs >= 30 ? mins + 1 : mins;
  if (r >= 60) return '1 hour';
  return `${r} min`;
}

export function formatCountdownPhrase(days, hours, mins, totalSecs) {
  const secs = totalSecs % 60;
  if (days >= 30) return fmtMonths(days);
  if (days >= 7) return fmtWeeksFromDays(days);
  if (days > 0) return fmtDays(days, hours);
  if (hours > 0) return fmtHours(hours, mins);
  if (mins > 0 || secs >= 30) return fmtMins(mins, secs);
  return '<1 min';
}

/**
 * Formats a "since" value for the widget face phrase.
 * e.g. "23 min", "2 days", "3 weeks", "8 months", "2 years"
 */
export function formatSincePhrase(days) {
  if (days < 1) return '<1 day';
  if (days < 7) {
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
  }
  if (days < 365) {
    const months = Math.round(days / 30.44);
    return `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  const years = Math.round((days / 365.25) * 10) / 10;
  const whole = years % 1 === 0;
  const val = whole ? Math.round(years) : years.toFixed(1);
  return `${val} ${years === 1 ? 'year' : 'years'}`;
}

/**
 * Compact duration label for list items — tiered from minutes to years.
 * e.g. "23m" → "5h" → "3d" → "2w" → "6mo" → "3y"
 */

function durYears(days) {
  const y = Math.round((days / 365.25) * 10) / 10;
  return `${y % 1 === 0 ? Math.round(y) : y.toFixed(1)}y`;
}

function durMonths(days) {
  const m = Math.floor(days / 30);
  const r = days % 30 >= 15 ? m + 1 : m;
  return `${r >= 12 ? 1 : r}${r >= 12 ? 'y' : 'mo'}`;
}

function durWeeks(days) {
  const w = Math.floor(days / 7);
  const r = days % 7 >= 4 ? w + 1 : w;
  return `${r >= 4 ? 1 : r}${r >= 4 ? 'mo' : 'w'}`;
}

function durDays(days, hours) {
  const r = hours >= 12 ? days + 1 : days;
  if (r >= 30) return '1mo';
  if (r >= 7) return durWeeks(r);
  return `${r}d`;
}

function durHours(hours, mins) {
  const r = mins >= 30 ? hours + 1 : hours;
  return r >= 24 ? '1d' : `${r}h`;
}

export function humanizeDuration(days, hours, mins) {
  if (days >= 365) return durYears(days);
  if (days >= 30) return durMonths(days);
  if (days >= 7) return durWeeks(days);
  if (days > 0) return durDays(days, hours);
  if (hours > 0) return durHours(hours, mins);
  if (mins > 0) return `${mins}m`;
  return '<1m';
}
