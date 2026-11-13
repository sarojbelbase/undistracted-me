/**
 * Focus Mode background state — aggregated for cross-device sync.
 *
 * The Focus Mode wallpaper lives in several small localStorage keys:
 *   - `fm_bg_source`          — 'default' | 'curated' | 'custom' | 'orb'
 *   - `fm_custom_bg_url`      — custom image URL (or null)
 *   - `fm_orb_palette_id`     — orb colour palette id
 *   - `fm_selected_photo_id`  — the curated photo the user explicitly chose
 *
 * The sync engine treats the whole background as one sync key (`focus_mode`),
 * so this module aggregates those keys into a single object on read and fans
 * the object back out to the individual keys on write. Every existing reader
 * (`FocusMode`, the App suspense fallback, `unsplash`) keeps reading the
 * individual `fm_*` keys unchanged.
 */

import { getBgSource, setBgSource } from './unsplash';

const CUSTOM_BG_URL_KEY = 'fm_custom_bg_url';
const ORB_PALETTE_KEY = 'fm_orb_palette_id';
const SELECTED_PHOTO_KEY = 'fm_selected_photo_id';

const DEFAULT_ORB_PALETTE = 'accent';

const getStr = (key) => {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

const setStr = (key, value) => {
  try {
    if (value == null || value === '') localStorage.removeItem(key);
    else localStorage.setItem(key, String(value));
  } catch {
    /* storage unavailable */
  }
};

/** Read the aggregated Focus Mode background state. */
export const readFocusModeState = () => ({
  bgSource: getBgSource(),
  customBgUrl: getStr(CUSTOM_BG_URL_KEY),
  orbPaletteId: getStr(ORB_PALETTE_KEY) || DEFAULT_ORB_PALETTE,
  selectedPhotoId: getStr(SELECTED_PHOTO_KEY),
});

/** Write the aggregated Focus Mode background state back to the individual keys. */
export const writeFocusModeState = (state) => {
  if (!state || typeof state !== 'object') return;
  if (state.bgSource != null) setBgSource(state.bgSource);
  if ('customBgUrl' in state) setStr(CUSTOM_BG_URL_KEY, state.customBgUrl);
  if (state.orbPaletteId != null) setStr(ORB_PALETTE_KEY, state.orbPaletteId);
  if ('selectedPhotoId' in state) setStr(SELECTED_PHOTO_KEY, state.selectedPhotoId);
};
