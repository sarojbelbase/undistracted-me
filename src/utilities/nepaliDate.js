/**
 * Bikram Sambat → Gregorian (AD) conversion.
 *
 * Pure, dependency-light so it can be imported by both the client and the
 * Vercel API functions (api/holidays.js).  The BS table is the same canonical
 * data used by the AD→BS converter in utilities/index.js, so the two directions
 * stay consistent (verified by round-trip tests).
 *
 * Anchor: BS 2000 Poush 17 === AD 1944-01-01, matching convertEnglishToNepali.
 */
import { NEPALI_YEARS_AND_DAYS_IN_MONTHS } from '../data/bikramSambatCalendar';

// Base anchor — the day-count origin shared with the AD→BS converter.
const BASE_BS_YEAR = 2000;
const BASE_BS_MONTH = 9; // Poush
const BASE_BS_DAY = 17; // Poush 17, 2000 === 1944-01-01
const BASE_AD_UTC = Date.UTC(1944, 0, 1);

const pad = (n) => String(n).padStart(2, '0');

/**
 * Convert a Bikram Sambat date to a Gregorian 'YYYY-MM-DD' string.
 *
 * @param {number} bsYear  BS year (e.g. 2083)
 * @param {number} bsMonth 1–12 (1 = Baisakh … 12 = Chaitra)
 * @param {number} bsDay   1–32
 * @returns {string|null} 'YYYY-MM-DD', or null when out of range / invalid.
 */
export function bsToAd(bsYear, bsMonth, bsDay) {
  const table = NEPALI_YEARS_AND_DAYS_IN_MONTHS;
  if (!table[bsYear] || bsMonth < 1 || bsMonth > 12 || bsDay < 1) return null;
  if (bsDay > table[bsYear][bsMonth - 1]) return null;

  // Count days from the anchor (BS 2000 Poush 17) to the target BS date.
  let days = 0;
  let y = BASE_BS_YEAR;
  let m = BASE_BS_MONTH;
  let d = BASE_BS_DAY;

  while (y < bsYear || (y === bsYear && m < bsMonth)) {
    days += table[y][m - 1] - d + 1; // remaining days in current month (inclusive)
    d = 1;
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  days += bsDay - d;

  const ad = new Date(BASE_AD_UTC + days * 86400000);
  return `${ad.getUTCFullYear()}-${pad(ad.getUTCMonth() + 1)}-${pad(ad.getUTCDate())}`;
}
