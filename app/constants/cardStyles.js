/**
 * @deprecated Theme tokens now live in `app/theme/profiles.js` (single source
 * of truth for paper / glass / comic × light / dark / focus).
 *
 * This module is kept as a thin re-export so existing import paths keep working.
 * New code should import from `app/theme/profiles.js`.
 */
export { CARD_STYLES } from "../theme/profiles";
