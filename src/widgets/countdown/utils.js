/**
 * Countdown widget utilities
 */

export const REPEAT_OPTIONS = [
  { label: 'Once', value: 'none' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' },
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
    else break; // safety — prevent infinite loop
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
 * Formats a Date as "Jan 1, 2026".
 */
export const formatTargetDate = (date) => {
  if (!date) return '';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};
