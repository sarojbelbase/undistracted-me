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
 * Builds calendar display data for the current date.
 * @param {'bs'|'ad'} calendarType
 * @returns {{ label, sublabel, days, year, month }}
 */
export const buildCalendarData = (calendarType) => {
  const now = getTimeZoneAwareDayJsInstance();
  const year = now.year();
  const month = now.month() + 1;
  const day = now.date();

  if (calendarType === 'bs') {
    const nepaliResult = convertEnglishToNepali(year, month, day);
    const [nepaliYear, nepaliMonth, nepaliDay] = nepaliResult.split(' ').map(Number);
    const daysInNepaliMonth = NEPALI_YEARS_AND_DAYS_IN_MONTHS[nepaliYear - BASE_NEPALI_YEAR][nepaliMonth];
    const firstDayOfMonth = now.subtract(nepaliDay - 1, 'day');
    const offset = firstDayOfMonth.day();
    const days = [
      ...Array.from({ length: offset }, () => ({ date: null, isCurrent: false, adDate: null })),
      ...Array.from({ length: daysInNepaliMonth }, (_, i) => ({
        date: i + 1,
        isCurrent: i + 1 === nepaliDay,
        adDate: firstDayOfMonth.add(i, 'day').format('YYYY-MM-DD'),
      })),
    ];
    return {
      label: NEPALI_MONTH_NAMES[nepaliMonth - 1],
      sublabel: String(nepaliYear),
      days,
      year: nepaliYear,
      month: nepaliMonth,
    };
  }

  // AD
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [
    ...Array.from({ length: firstDay }, () => ({ date: null, isCurrent: false })),
    ...Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      isCurrent: i + 1 === day,
    })),
  ];
  return {
    label: AD_MONTH_NAMES[month - 1],
    sublabel: String(year),
    days,
    year,
    month,
  };
};

/**
 * Returns a Set of event date strings ('YYYY-MM-DD') for quick lookup.
 */
export const buildEventDateSet = (events) =>
  new Set(events.map((e) => e.startDate).filter(Boolean));
