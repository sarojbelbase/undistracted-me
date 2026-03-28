/**
 * Centralized localStorage key registry.
 *
 * Every key used in the app lives here so typos are caught at the
 * import site instead of silently producing empty reads at runtime.
 *
 * Usage:
 *   import { STORAGE_KEYS } from '../constants/storageKeys';
 *   localStorage.getItem(STORAGE_KEYS.EVENTS);
 *   localStorage.getItem(STORAGE_KEYS.widgetSettings('clock'));
 */

export const STORAGE_KEYS = Object.freeze({
  // ── Global settings (Zustand persist) ────────────────────────────────
  SETTINGS: 'undistracted_settings',

  // ── Widget system ─────────────────────────────────────────────────────
  WIDGET_INSTANCES: 'widget_instances',
  WIDGET_LAYOUT: 'widget_grid_layouts',

  /** Returns the per-widget settings key for the given widgetId. */
  widgetSettings: (widgetId) => `widgetSettings_${widgetId}`,

  // ── Widget data ───────────────────────────────────────────────────────
  EVENTS: 'widget_events',
  COUNTDOWN_EVENTS: 'countdown_events',
  COUNTDOWN_PINNED: 'countdown_pinned',
  POMODORO: 'fm_pomodoro',

  // ── Focus mode ────────────────────────────────────────────────────────
  UNSPLASH_CACHE: 'fm_unsplash_cache',
  FOCUS_TIMEZONES: 'fm_world_clocks',

  // ── Integrations ──────────────────────────────────────────────────────
  GCAL_CACHE: 'gcal_events_cache',
  GCAL_ACCESS_TOKEN: 'gcal_access_token',
  GCAL_PROFILE_CACHE: 'gcal_profile_cache',
  SPOTIFY_TOKENS: 'spotify_tokens',
  SPOTIFY_PROFILE: 'spotify_profile',

  // ── Legacy / migration ────────────────────────────────────────────────
  /** @deprecated Migrated to WIDGET_INSTANCES */
  LEGACY_WIDGET_ENABLED_IDS: 'widget_enabled_ids',
});
