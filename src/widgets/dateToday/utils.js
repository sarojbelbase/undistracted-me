/**
 * Date Today widget utilities
 */
import { getTimeZoneAwareDayJsInstance, convertEnglishToNepali } from '../../utilities';
import { LANGUAGES, MONTH_NAMES as NEPALI_MONTH_NAMES } from '../../constants';

export const EN_WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const EN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Returns { weekday, month, day } for the current date in the given language.
 * @param {'en'|'ne'} language
 */
export const getDateParts = (language) => {
  const now = getTimeZoneAwareDayJsInstance();
  const weekdayIndex = now.day();

  if (language === LANGUAGES.ne) {
    const [y, m, d] = now.format('YYYY M D').split(' ').map(Number);
    const nepaliResult = convertEnglishToNepali(y, m, d);
    const [nepaliYear, nepaliMonthStr, nepaliDayStr] = nepaliResult.split(' ');
    return {
      weekday: EN_WEEKDAYS[weekdayIndex],
      month: NEPALI_MONTH_NAMES[parseInt(nepaliMonthStr) - 1],
      day: String(parseInt(nepaliDayStr)).padStart(2, '0'),
      year: nepaliYear,
    };
  }

  return {
    weekday: EN_WEEKDAYS[weekdayIndex],
    month: EN_MONTHS[now.month()],
    day: String(now.date()).padStart(2, '0'),
    year: String(now.year()),
  };
};
