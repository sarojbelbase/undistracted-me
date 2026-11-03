/**
 * Curated international holidays — global observances + major worldwide
 * festivals with AD-fixed dates.
 *
 * Unlike the Nepali holidays (scraped from Wikipedia as Bikram Sambat dates),
 * these are a hand-maintained list of country-agnostic dates: United Nations /
 * international days plus major secular celebrations (New Year, Christmas,
 * Halloween, Valentine's, Labour Day, …).
 *
 * Lunar festivals (Eid al-Fitr, Eid al-Adha, Diwali, Holi, Chinese New Year)
 * are deliberately excluded: they follow a lunisolar calendar, so their
 * Gregorian dates shift every year and cannot be expressed as a fixed list.
 *
 * Each entry is `[month, day, "Name"]` (month/day are 1-based).
 */

const FIXED = [
  [1, 1, "New Year's Day"],
  [2, 14, "Valentine's Day"],
  [3, 8, "International Women's Day"],
  [3, 17, "Saint Patrick's Day"],
  [3, 20, "International Day of Happiness"],
  [4, 1, "April Fools' Day"],
  [4, 7, "World Health Day"],
  [4, 22, "Earth Day"],
  [5, 1, "International Workers' Day"],
  [6, 1, "International Children's Day"],
  [6, 5, "World Environment Day"],
  [6, 21, "International Day of Yoga"],
  [8, 12, "International Youth Day"],
  [9, 21, "International Day of Peace"],
  [10, 1, "International Day of Older Persons"],
  [10, 5, "World Teachers' Day"],
  [10, 10, "World Mental Health Day"],
  [10, 16, "World Food Day"],
  [10, 24, "United Nations Day"],
  [10, 31, "Halloween"],
  [11, 1, "All Saints' Day"],
  [11, 13, "World Kindness Day"],
  [11, 20, "Universal Children's Day"],
  [12, 1, "World AIDS Day"],
  [12, 10, "Human Rights Day"],
  [12, 24, "Christmas Eve"],
  [12, 25, "Christmas Day"],
  [12, 26, "Boxing Day"],
  [12, 31, "New Year's Eve"],
];

const pad = (n) => String(n).padStart(2, '0');

/**
 * Expand the fixed-date list into AD-dated holidays for the given years.
 *
 * @param {number[]} adYears Gregorian years to expand into.
 * @returns {{ date: string, name: string, kind: 'international' }[]}
 */
export function buildInternationalHolidays(adYears) {
  const years = Array.isArray(adYears) && adYears.length ? adYears : [new Date().getFullYear()];
  const out = [];
  for (const [month, day, name] of FIXED) {
    for (const y of years) {
      out.push({ date: `${y}-${pad(month)}-${pad(day)}`, name, kind: 'international' });
    }
  }
  out.sort((a, b) => a.date.localeCompare(b.date));
  return out;
}

export const INTERNATIONAL_HOLIDAY_COUNT = FIXED.length;
