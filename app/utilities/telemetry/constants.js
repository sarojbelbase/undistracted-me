/**
 * Telemetry event names: single source of truth.
 *
 * Every event the app sends is defined here as a constant, so call sites never
 * hardcode magic strings (and renaming an event touches exactly one place).
 * Widget *actions* (started/saved/created/…) share a generic verb and are
 * disambiguated by a `widget_type` property derived from the widget config, so
 * a new widget type is tracked automatically with zero new constants.
 *
 * The `WIDGET_EVENT_PREFIX` drives that dynamic naming (see `trackWidgetEvent`
 * in index.js).
 */

export const WIDGET_EVENT_PREFIX = 'widget';

/** Build a widget event name dynamically: `widgetEvent('added')` → "widget_added". */
export const widgetEvent = (verb) => `${WIDGET_EVENT_PREFIX}_${verb}`;

export const TELEMETRY_EVENTS = Object.freeze({
  // ── Session ───────────────────────────────────────────────────────────
  APP_OPENED: 'app_opened',

  // ── Widget lifecycle (one per widget type via `widget_type` prop) ─────
  WIDGET_ADDED: widgetEvent('added'),
  WIDGET_REMOVED: widgetEvent('removed'),
  WIDGET_DUPLICATED: widgetEvent('duplicated'),

  // ── Widget actions (generic verbs + `widget_type` prop) ───────────────
  WIDGET_STARTED: widgetEvent('started'),
  WIDGET_SAVED: widgetEvent('saved'),
  WIDGET_CREATED: widgetEvent('created'),
  WIDGET_IMPORTED: widgetEvent('imported'),
  WIDGET_COMPLETED: widgetEvent('completed'),

  // ── Accounts / integrations ───────────────────────────────────────────
  ACCOUNT_CONNECTED: 'account_connected',
  ACCOUNT_DISCONNECTED: 'account_disconnected',

  // ── Cross-device sync ─────────────────────────────────────────────────
  SYNC_ENABLED: 'sync_enabled',
  SYNC_DISABLED: 'sync_disabled',

  // ── LookAway eye-break system ─────────────────────────────────────────
  LOOKAWAY_ENABLED: 'lookaway_enabled',
  LOOKAWAY_DISABLED: 'lookaway_disabled',
  LOOKAWAY_TRIGGERED: 'lookaway_triggered',

  // ── Site blocking ─────────────────────────────────────────────────────
  BLOCK_SITE_ADDED: 'block_site_added',
  BLOCK_SITE_REMOVED: 'block_site_removed',
  BLOCK_PAGE_SHOWN: 'block_page_shown',

  // ── Personalization ───────────────────────────────────────────────────
  BACKGROUND_CHANGED: 'background_changed',
  ACCENT_CHANGED: 'accent_changed',
  MODE_CHANGED: 'mode_changed',

  // ── Dialogs / overlays ────────────────────────────────────────────────
  WIDGET_CATALOG_OPENED: 'widget_catalog_opened',

  // ── Misc features ─────────────────────────────────────────────────────
  SEARCH_USED: 'search_used',
  QUICK_TOUR_SHOWN: 'quick_tour_shown',
  CLIP_SAVED: 'clip_saved',
  TASK_ADDED: 'task_added',
  TASK_COMPLETED: 'task_completed',
});
