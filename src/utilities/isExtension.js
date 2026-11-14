/**
 * Shared check — are we running inside a Chrome/Firefox extension?
 *
 * Kept in its own dependency-free leaf module so the background service worker
 * (via `siteBlocker.js` / `syncEngine.js`) can import it without dragging
 * `dayjs` + the Bikram Sambat calendar table into the MV3 bundle — both of
 * which live in `utilities/index.js` as top-level side effects.
 */
export const isExtension = () => !!globalThis.chrome?.runtime?.id;
