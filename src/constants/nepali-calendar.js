/**
 * Nepali calendar locale constants.
 *
 * - NEPALI_YEARS_AND_DAYS_IN_MONTHS  : re-exported from data/bikramSambatCalendar.js
 *                                      (algorithm data lives in src/data/, not this barrel)
 * - MONTH_NAMES                      : romanised Nepali month names
 * - MONTH_NAMES_IN_NEPALI            : Devanagari month names
 * - DAY_NAMES                        : Devanagari weekday names (Sunday-indexed)
 * - ENGLISH_MONTH_NAMES              : Devanagari names for Gregorian months
 * - NUMBER_MAPPING                   : ASCII digit → Devanagari digit
 * - DATE_TODAY_FORMATS               : dayjs format strings per language
 * - LIVE_CLOCK_FORMATS               : dayjs format strings for live clock per language
 */

// Algorithm data — canonical home is src/data/bikramSambatCalendar.js.
// Re-exported here so any existing `from '../constants/nepali-calendar'` paths keep working.
export { NEPALI_YEARS_AND_DAYS_IN_MONTHS } from '../data/bikramSambatCalendar';


export const MONTH_NAMES = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
];

export const MONTH_NAMES_IN_NEPALI = [
  "बैशाख", "जेष्ठ", "आषाढ", "साउन",
  "भाद्र", "आश्विन", "कार्तिक", "मंसिर",
  "पौष", "माघ", "फाल्गुन", "चैत्र",
];

/** Devanagari weekday names — Sunday = index 0. */
export const DAY_NAMES = [
  "आइतबार", "सोमबार", "मंगलबार", "बुधबार",
  "बिहीबार", "शुक्रबार", "शनिबार",
];

/** Devanagari labels for the twelve Gregorian months. */
export const ENGLISH_MONTH_NAMES = [
  "जनवरी", "फेब्रुवरी", "मार्च", "अप्रिल",
  "मे", "जुन", "जुलाई", "अगस्ट",
  "सेप्टेम्बर", "अक्टोबर", "नोभेम्बर", "डिसेम्बर",
];

/** Maps ASCII digits 0–9 to their Devanagari Unicode equivalents. */
export const NUMBER_MAPPING = {
  0: "०", 1: "१", 2: "२", 3: "३", 4: "४",
  5: "५", 6: "६", 7: "७", 8: "८", 9: "९",
};

/** dayjs format strings used by getDateTodayInSelectedLanguage. */
export const DATE_TODAY_FORMATS = {
  ne: "M D d",
  en: "MMMM D dddd",
};

/** dayjs format strings used by getLiveClockInSelectedLanguage. */
export const LIVE_CLOCK_FORMATS = {
  ne: "HH mm ss",
  en: "HH mm ss",
};
