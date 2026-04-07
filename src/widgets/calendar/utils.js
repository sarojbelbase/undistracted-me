/**
 * Calendar widget utilities
 */
import { getTimeZoneAwareDayJsInstance, convertEnglishToNepali } from '../../utilities';
import { MONTH_NAMES as NEPALI_MONTH_NAMES, NEPALI_YEARS_AND_DAYS_IN_MONTHS } from '../../constants';

export const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
export const BASE_NEPALI_YEAR = 2000;
export const AD_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const DEFAULTS = { calendarType: 'bs' };

/**
 * Builds calendar display data for a given month offset from today.
 * @param {'bs'|'ad'} calendarType
 * @param {number} monthOffset  0 = current month, negative = past, positive = future
 * @returns {{ label, sublabel, days, year, month }}
 */
export const buildCalendarData = (calendarType, monthOffset = 0) => {
  const now = getTimeZoneAwareDayJsInstance();
  const year = now.year();
  const month = now.month() + 1;
  const day = now.date();

  if (calendarType === 'bs') {
    const nepaliResult = convertEnglishToNepali(year, month, day);
    const [nepaliYear, nepaliMonth, nepaliDay] = nepaliResult.split(' ').map(Number);

    // Walk month by month from the current BS month to the target
    let targetYear = nepaliYear;
    let targetMonth = nepaliMonth;
    const dir = monthOffset > 0 ? 1 : -1;
    let remaining = Math.abs(monthOffset);
    while (remaining > 0) {
      targetMonth += dir;
      if (targetMonth > 12) { targetYear++; targetMonth = 1; }
      else if (targetMonth < 1) { targetYear--; targetMonth = 12; }
      remaining--;
    }

    const yearIdx = targetYear - BASE_NEPALI_YEAR;
    // Clamp to known data range
    if (!NEPALI_YEARS_AND_DAYS_IN_MONTHS[yearIdx]) return buildCalendarData(calendarType, 0);

    const daysInTargetMonth = NEPALI_YEARS_AND_DAYS_IN_MONTHS[yearIdx][targetMonth];

    // AD date of day-1 of the current BS month
    let firstOfTarget = now.subtract(nepaliDay - 1, 'day');

    // Advance / retreat to day-1 of the target BS month
    let walkYear = nepaliYear;
    let walkMonth = nepaliMonth;
    let walkRemaining = Math.abs(monthOffset);
    while (walkRemaining > 0) {
      if (dir > 0) {
        const daysInWalk = NEPALI_YEARS_AND_DAYS_IN_MONTHS[walkYear - BASE_NEPALI_YEAR][walkMonth];
        firstOfTarget = firstOfTarget.add(daysInWalk, 'day');
        walkMonth++;
        if (walkMonth > 12) { walkYear++; walkMonth = 1; }
      } else {
        walkMonth--;
        if (walkMonth < 1) { walkYear--; walkMonth = 12; }
        const daysInWalk = NEPALI_YEARS_AND_DAYS_IN_MONTHS[walkYear - BASE_NEPALI_YEAR][walkMonth];
        firstOfTarget = firstOfTarget.subtract(daysInWalk, 'day');
      }
      walkRemaining--;
    }

    const gridOffset = firstOfTarget.day();
    const isCurrentMonth = targetYear === nepaliYear && targetMonth === nepaliMonth;

    const days = [
      ...Array.from({ length: gridOffset }, () => ({ date: null, isCurrent: false, adDate: null })),
      ...Array.from({ length: daysInTargetMonth }, (_, i) => ({
        date: i + 1,
        isCurrent: isCurrentMonth && i + 1 === nepaliDay,
        adDate: firstOfTarget.add(i, 'day').format('YYYY-MM-DD'),
      })),
    ];
    return {
      label: NEPALI_MONTH_NAMES[targetMonth - 1],
      sublabel: String(targetYear),
      days,
      year: targetYear,
      month: targetMonth,
    };
  }

  // AD — JS Date handles year roll-over automatically
  const base = new Date(year, month - 1 + monthOffset, 1);
  const targetYear = base.getFullYear();
  const targetMonth = base.getMonth() + 1;
  const firstDay = base.getDay();
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const isCurrentMonth = targetYear === year && targetMonth === month;

  const days = [
    ...Array.from({ length: firstDay }, () => ({ date: null, isCurrent: false })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      isCurrent: isCurrentMonth && i + 1 === day,
    })),
  ];
  return {
    label: AD_MONTH_NAMES[targetMonth - 1],
    sublabel: String(targetYear),
    days,
    year: targetYear,
    month: targetMonth,
  };
};

/**
 * Returns a Set of event date strings ('YYYY-MM-DD') for quick lookup.
 */
export const buildEventDateSet = (events) =>
  new Set(events.map((e) => e.startDate).filter(Boolean));
