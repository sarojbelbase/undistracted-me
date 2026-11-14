/**
 * Nepali calendar locale constants.
 *
 * - NEPALI_YEARS_AND_DAYS_IN_MONTHS  : re-exported from data/bikramSambatCalendar.js
 *                                      (algorithm data lives in app/data/, not this barrel)
 * - MONTH_NAMES                      : romanised Nepali month names
 * - NUMBER_MAPPING                   : ASCII digit → Devanagari digit
 */

// Algorithm data — canonical home is app/data/bikramSambatCalendar.js.
// Re-exported here so any existing `from '../constants/nepali-calendar'` paths keep working.
export { NEPALI_YEARS_AND_DAYS_IN_MONTHS } from '../data/bikramSambatCalendar';


export const MONTH_NAMES = [
  "Baishakh", "Jestha", "Ashadh", "Shrawan",
  "Bhadra", "Ashwin", "Kartik", "Mangsir",
  "Poush", "Magh", "Falgun", "Chaitra",
];

/** Maps ASCII digits 0–9 to their Devanagari Unicode equivalents. */
export const NUMBER_MAPPING = {
  0: "०", 1: "१", 2: "२", 3: "३", 4: "४",
  5: "५", 6: "६", 7: "७", 8: "८", 9: "९",
};
