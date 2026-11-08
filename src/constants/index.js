export const LANGUAGES = Object.freeze({ ne: "ne", en: "en" });

// ── Nepali calendar data — canonical home is constants/nepali-calendar.js ──
// Re-exported here so all existing `import { … } from '../../constants'` paths
// continue to work without any changes at the import sites.
export {
  NEPALI_YEARS_AND_DAYS_IN_MONTHS,
  MONTH_NAMES,
  NUMBER_MAPPING,
} from './nepali-calendar';

