/**
 * Shared date helpers for the expense widget.
 * Single source of truth for date math — used by useExpenses, Widget, Settings,
 * and RecentExpensesModal.
 */

export const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function startOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function startOfWeek(weekStartsOn = 'monday') {
  const d = new Date();
  const day = d.getDay();
  const mondayOffset = day === 0 ? 6 : day - 1;
  const off = weekStartsOn === 'monday' ? mondayOffset : day;
  d.setDate(d.getDate() - off);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOfYear() {
  const d = new Date();
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function startOf(range, weekStartsOn) {
  if (range === 'month') return startOfMonth();
  if (range === 'year') return startOfYear();
  return startOfWeek(weekStartsOn);
}

/** Format a timestamp as a human-readable date string. */
export function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const tEnd = new Date(tStart);
  tEnd.setHours(23, 59, 59, 999);

  if (ts >= tStart.getTime() && ts <= tEnd.getTime()) return 'Today';

  const yStart = new Date(tStart);
  yStart.setDate(yStart.getDate() - 1);
  const yEnd = new Date(yStart);
  yEnd.setHours(23, 59, 59, 999);

  if (ts >= yStart.getTime() && ts <= yEnd.getTime()) return 'Yesterday';

  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** Get period bounds (start/end Date objects) for a given timeRange and offset. */
export function getPeriodBounds(timeRange, offset) {
  const now = new Date();
  if (timeRange === 'week') {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset + offset * 7);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return { start: weekStart, end: weekEnd };
  }
  if (timeRange === 'month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0, 0);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start: monthStart, end: monthEnd };
  }
  // year
  const yearStart = new Date(now.getFullYear() + offset, 0, 1, 0, 0, 0, 0);
  const yearEnd = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59, 999);
  return { start: yearStart, end: yearEnd };
}

/** Get a human-readable label for a period offset. */
export function getPeriodLabel(timeRange, offset) {
  if (timeRange === 'week') {
    if (offset === 0) return 'This Week';
    if (offset === -1) return 'Last Week';
    const { start } = getPeriodBounds('week', offset);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (d) => `${MONTHS[d.getMonth()]} ${d.getDate()}`;
    return `${fmt(start)} – ${fmt(end)}`;
  }
  if (timeRange === 'month') {
    if (offset === 0) return 'This Month';
    const { start } = getPeriodBounds('month', offset);
    return `${MONTHS[start.getMonth()]} ${start.getFullYear()}`;
  }
  if (offset === 0) return 'This Year';
  const { start } = getPeriodBounds('year', offset);
  return `${start.getFullYear()}`;
}
