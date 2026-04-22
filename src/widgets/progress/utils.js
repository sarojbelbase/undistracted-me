/**
 * Day Progress widget utilities
 */

import { convertEnglishToNepali } from '../../utilities/index.js';
import { NEPALI_YEARS_AND_DAYS_IN_MONTHS, MONTH_NAMES } from '../../constants/index.js';

const DOTS = 24;

const AD_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const PERIOD_TYPES = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
  { id: 'year', label: 'Year' },
];

export const CALENDAR_TYPES = [
  { id: 'ad', label: 'AD' },
  { id: 'bs', label: 'BS' },
];

export const DEFAULT_PERIOD = 'day';
export const DEFAULT_CALENDAR = 'ad';

/** Returns the current date/time in Nepal timezone (UTC+5:45). */
function getNepalNow() {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utcMs + (5 * 60 + 45) * 60000);
}

/** Returns the current Bikram Sambat date plus Nepal hours/minutes. */
function getNepaliDate() {
  const nepal = getNepalNow();
  const result = convertEnglishToNepali(
    nepal.getFullYear(),
    nepal.getMonth() + 1,
    nepal.getDate(),
  );
  if (typeof result !== 'string' || result.includes('Invalid')) return null;
  const [bsYear, bsMonth, bsDay] = result.split(' ').map(Number);
  return { bsYear, bsMonth, bsDay, hours: nepal.getHours(), minutes: nepal.getMinutes() };
}

// Pre-compute yearly totals once at module load — avoids a 12-element reduce
// every call to bsDaysInYear (which runs on every minute tick in the widget).
const _bsYearTotals = {};
for (const [yr, months] of Object.entries(NEPALI_YEARS_AND_DAYS_IN_MONTHS)) {
  _bsYearTotals[yr] = months.reduce((a, b) => a + b, 0);
}

function bsDaysInYear(bsYear) {
  return _bsYearTotals[bsYear] ?? 365;
}

function bsDaysInMonth(bsYear, bsMonth) {
  const months = NEPALI_YEARS_AND_DAYS_IN_MONTHS[bsYear];
  return months ? months[bsMonth - 1] : 30;
}

function yearProgressAD() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear() + 1, 0, 1);
  return {
    ratio: (now - start) / (end - start),
    subtitle: `${AD_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  };
}

function yearProgressBS() {
  const bs = getNepaliDate();
  if (!bs) return { ratio: 0, subtitle: null };
  const { bsYear, bsMonth, bsDay, hours, minutes } = bs;
  const months = NEPALI_YEARS_AND_DAYS_IN_MONTHS[bsYear];
  let elapsedDays = 0;
  if (months) {
    for (let m = 0; m < bsMonth - 1; m++) elapsedDays += months[m];
  }
  elapsedDays += (bsDay - 1) + (hours * 60 + minutes) / (24 * 60);
  return {
    ratio: elapsedDays / bsDaysInYear(bsYear),
    subtitle: `${MONTH_NAMES[bsMonth - 1]} ${bsYear}`,
  };
}

function monthProgressAD() {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedMins = (now.getDate() - 1) * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  return {
    ratio: elapsedMins / (daysInMonth * 24 * 60),
    subtitle: `${AD_MONTHS[now.getMonth()]} ${now.getFullYear()}`,
  };
}

function monthProgressBS() {
  const bs = getNepaliDate();
  if (!bs) return { ratio: 0, subtitle: null };
  const { bsYear, bsMonth, bsDay, hours, minutes } = bs;
  const totalDays = bsDaysInMonth(bsYear, bsMonth);
  const elapsedMins = (bsDay - 1) * 24 * 60 + hours * 60 + minutes;
  return {
    ratio: elapsedMins / (totalDays * 24 * 60),
    subtitle: `${MONTH_NAMES[bsMonth - 1]} ${bsYear}`,
  };
}

function weekProgress() {
  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const elapsedMins = dayOfWeek * 24 * 60 + now.getHours() * 60 + now.getMinutes();
  return { ratio: elapsedMins / (7 * 24 * 60), subtitle: null };
}

function dayProgress() {
  const now = new Date();
  const elapsedMins = now.getHours() * 60 + now.getMinutes();
  return { ratio: elapsedMins / (24 * 60), subtitle: null };
}

/**
 * Returns progress info for the given period and calendar.
 * Always uses 24 dots.
 * @param {'day'|'week'|'month'|'year'} period
 * @param {'ad'|'bs'} calendar
 * @returns {{ percentage: number, filledDots: number, label: string, subtitle: string|null }}
 */
export const getProgress = (period, calendar = 'ad') => {
  const resolvers = {
    year: () => (calendar === 'bs' ? yearProgressBS() : yearProgressAD()),
    month: () => (calendar === 'bs' ? monthProgressBS() : monthProgressAD()),
    week: weekProgress,
    day: dayProgress,
  };
  const { ratio, subtitle } = (resolvers[period] ?? resolvers.day)();
  const label = PERIOD_TYPES.find(p => p.id === period)?.label ?? 'Day';
  return {
    percentage: Math.floor(ratio * 100),
    filledDots: Math.round(ratio * DOTS),
    label,
    subtitle,
  };
};
