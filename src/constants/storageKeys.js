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
  /** Per-widget-instance key for the countdown "already notified" map. */
  COUNTDOWN_NOTIFIED: 'cd_notified',
  /** Returns the per-instance pinned state key for the countdown widget. */
  countdownPinned: (widgetId) => `countdown_pinned_${widgetId}`,
  POMODORO: 'fm_pomodoro',
  /** Returns the per-instance timer persist key for the pomodoro widget. */
  pomodoroTimerState: (widgetId) => `pomodoro_timer_state_${widgetId}`,

  // ── Auto-theme / geolocation ──────────────────────────────────────────
  AUTO_THEME_COORDS: 'auto_theme_coords',
  AUTO_THEME_COORDS_SOURCE: 'auto_theme_coords_source',

  // ── Focus mode ────────────────────────────────────────────────────────
  UNSPLASH_CACHE: 'fm_unsplash_cache',
  FOCUS_TIMEZONES: 'fm_world_clocks',

  // ── Integrations ──────────────────────────────────────────────────────
  GCAL_CACHE: 'gcal_events_cache',
  GCAL_ACCESS_TOKEN: 'gcal_access_token',
  GCAL_PROFILE_CACHE: 'gcal_profile_cache',
  SPOTIFY_TOKENS: 'spotify_tokens',
  SPOTIFY_PROFILE: 'spotify_profile',

  // ── Legacy / migration keys (read-only, never written by new code) ────
  _LEGACY: Object.freeze({
    LANGUAGE: 'language',
    ACCENT: 'app_accent',
    MODE: 'app_mode',
    DEFAULT_VIEW: 'defaultView',
    DATE_FORMAT: 'focusDateFormat',
    WIDGET_ENABLED_IDS: 'widget_enabled_ids',
  }),
});
