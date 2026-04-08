/**
 * Day Progress widget utilities
 */

/** Built-in schedule presets. */
export const PRESETS = [
  { id: 'day', label: 'Day Progress', startHour: 0, endHour: 24 },
  { id: 'work96', label: 'Work  9 – 6', startHour: 9, endHour: 18 },
  { id: 'work105', label: 'Work  10 – 5', startHour: 10, endHour: 17 },
  { id: 'evening', label: 'Evening  1 – 10', startHour: 13, endHour: 22 },
  { id: 'custom', label: 'Custom', startHour: 9, endHour: 17 },
];

/**
 * Returns progress within an arbitrary hour range.
 * @param {number} startHour  0–23
 * @param {number} endHour    1–24  (endHour > startHour)
 * @returns {{ percentage: number, filledDots: number, totalDots: number }}
 */
export const getProgressForRange = (startHour, endHour) => {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const startMins = startHour * 60;
  const endMins = endHour * 60;
  const rangeMins = endMins - startMins;
  const totalDots = endHour - startHour;

  const DOTS = 24;
  if (nowMins <= startMins) return { percentage: 0, filledDots: 0, totalDots: DOTS };
  if (nowMins >= endMins) return { percentage: 100, filledDots: DOTS, totalDots: DOTS };

  const elapsed = nowMins - startMins;
  const percentage = Math.floor((elapsed / rangeMins) * 100);
  const filledDots = Math.round((elapsed / rangeMins) * DOTS);
  return { percentage, filledDots, totalDots: DOTS };
};

/**
 * Legacy helper kept for backward-compat (unused internally, but exported so
 * any external callers don't break).
 */
export const getDayProgress = () => getProgressForRange(0, 24);

/** @deprecated Use getProgressForRange instead. */
export const TOTAL_DOTS = 24;
