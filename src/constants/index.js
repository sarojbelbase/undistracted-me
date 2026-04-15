export const LANGUAGES = Object.freeze({ ne: "ne", en: "en" });

/**
 * Human-label → value map for the language selector UI.
 * Use LANGUAGES (above) for logic comparisons; use LANGUAGE_OPTIONS for rendering.
 */
export const LANGUAGE_OPTIONS = Object.freeze({ Nepali: "ne", English: "en" });

export const FONTS = {
  ne: "Akshar",
  en: "Google Sans",
};

// ── Nepali calendar data — canonical home is constants/nepali-calendar.js ──
// Re-exported here so all existing `import { … } from '../../constants'` paths
// continue to work without any changes at the import sites.
export {
  NEPALI_YEARS_AND_DAYS_IN_MONTHS,
  MONTH_NAMES,
  MONTH_NAMES_IN_NEPALI,
  DAY_NAMES,
  ENGLISH_MONTH_NAMES,
  NUMBER_MAPPING,
  DATE_TODAY_FORMATS,
  LIVE_CLOCK_FORMATS,
} from './nepali-calendar';

