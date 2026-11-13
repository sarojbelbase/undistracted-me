/**
 * ─── Defaults — Single Source of Truth ────────────────────────────────────────
 *
 * Every default value in the app lives here so it can be read and modified from
 * one place. Components, stores, and hooks import from this module instead of
 * hardcoding fallbacks inline.
 *
 * ⚠️  Keep this file PURE — no React / bootstrap-icons / DOM imports. It is
 *     transitively imported by the service worker (`bg.js` via
 *     `constants/notifications.js`), which must stay lean. UI-only decorations
 *     (e.g. expense category icons) live in their own feature module and are
 *     attached to the data defined here.
 *
 * Sections:
 *   • APP_SETTINGS_DEFAULTS    — global settings store (useSettingsStore)
 *   • WIDGET_SETTINGS_DEFAULTS — per-widget-type default settings
 *   • NOTIFICATION_TYPES       — notification type registry + enabled defaults
 *   • Widget constants          — default symbols, periods, categories, etc.
 *   • DEMO_*                   — first-run seed content (Quick Tour / reset)
 */

import { MOMO_URL } from './urls.js';

// ─── App settings (useSettingsStore) ──────────────────────────────────────────

export const APP_SETTINGS_DEFAULTS = Object.freeze({
  accent: "Latte",
  mode: "light",
  defaultView: "canvas",
  dateFormat: "gregorian",
  lookAwayEnabled: false,
  lookAwayInterval: 20, // minutes between eye-break reminders
  // "Motion" background = the animated orb, tinted by the active accent.
  canvasBg: { type: "orb", orbId: "accent", url: null },
  cardStyle: "paper",
  modePrefs: {
    light: { cardStyle: "paper" },
    dark: { cardStyle: "paper" },
  },
  notificationsEnabled: true,
  quickTourSeenVersion: null,
  syncEnabled: false,

  // Focus Mode
  clockFormat: "24h",
  focusSearchBar: true,
  focusTasks: true,
  focusSearchTopSites: true,
  focusSearchWeb: true,
  focusPanels: {
    pomodoro: true,
    event: true,
    occasion: true,
    stock: true,
    spotify: true,
  },
});

// ─── Widget settings defaults (keyed by widget type) ──────────────────────────

// Frozen (shallow) so callers can't accidentally mutate the shared defaults by
// reference — `useWidgetSettings` returns a copy, and any in-place mutation of
// a default would otherwise corrupt the value for every widget instance.
export const WIDGET_SETTINGS_DEFAULTS = Object.freeze({
  clock: { format: "24h", timezones: [] },
  dateToday: { language: "en" },
  calendar: { calendarType: "bs", showHolidays: true },
  progress: { period: "day", calendar: "ad" },
  stock: { symbols: ["NEPSE"] },
  notes: { notes: [""], idx: 0 },
  bookmark: { url: "", name: "", iconMode: "favicon" },
  pomodoro: {
    soundEnabled: true,
    autoBreak: false,
    breakDuration: 5, // minutes
    rainSound: false,
  },
  dailys: { mode: "quote", autoSlide: true },
  rss: {
    activeFeedIds: ["hn", "bbc", "guardian"],
    customFeeds: [], // [{ label, url, active: boolean }]
    sourceMode: "presets", // "presets" | "custom"
    viewMode: "marquee",
  },
  weather: {
    location: null,
    unit: "metric",
    style: "minimal",
    showAQI: true,
    showSunTimes: true,
  },
  expense: {
    currency: "USD",
    weekStartsOn: "monday",
    timeRange: "week",
    weekBudget: "",
    monthBudget: "",
    yearBudget: "",
  },
});

// ─── Notification type registry ───────────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  { id: "events", label: "Events", description: "Reminder 5 min before a calendar event starts" },
  { id: "occasion", label: "Occasions", description: "Birthday & anniversary reminder at 9 AM on the day" },
  { id: "countdown", label: "Countdown", description: "Alert when a countdown timer reaches zero" },
  { id: "pomodoro", label: "Pomodoro", description: "When a focus session ends" },
  { id: "lookaway", label: "Look Away", description: "Eye-break reminders" },
];

export const DEFAULT_NOTIFICATION_TYPES = {
  events: true,
  occasion: true,
  countdown: true,
  pomodoro: true,
  lookaway: true,
};

// ─── Widget constants (defaults) ──────────────────────────────────────────────

/** Default NEPSE watchlist symbol(s). */
export const DEFAULT_SYMBOLS = ["NEPSE"];

/** Default active RSS feeds. */
export const DEFAULT_RSS_ACTIVE_IDS = ["hn", "bbc", "guardian"];

/** Default progress widget period + calendar. */
export const DEFAULT_PROGRESS_PERIOD = "day";
export const DEFAULT_PROGRESS_CALENDAR = "ad";

/**
 * Default expense categories — pure identity data (id / label / description).
 * Icons are React components and are attached in `widgets/expense/useExpenses.js`
 * to keep this module importable from the service worker.
 */
export const DEFAULT_CATEGORIES = [
  { id: "bills", label: "Bills & Utilities", description: "Electricity, water, internet, phone, subscriptions" },
  { id: "rent", label: "Rent", description: "Monthly rent, housing loan, property tax" },
  { id: "groceries", label: "Groceries", description: "Supermarket, household supplies, pantry" },
  { id: "health", label: "Health", description: "Doctor, pharmacy, gym, wellness" },
  { id: "food", label: "Food & Drinks", description: "Meals, coffee, snacks, dining out" },
  { id: "shopping", label: "Shopping", description: "Clothes, accessories, retail purchases" },
  { id: "tech", label: "Gadgets", description: "Gadgets, accessories, repairs, software" },
  { id: "gifts", label: "Gifts", description: "Presents, donations, celebrations" },
  { id: "transport", label: "Transport", description: "Bus, train, fuel, parking, rideshare" },
  { id: "travel", label: "Travel", description: "Flights, hotels, tours, holidays" },
  { id: "work", label: "Work/Study", description: "Office supplies, printing, freelancing costs" },
  { id: "insurance", label: "Insurance", description: "Health, car, life, home insurance" },
  { id: "entertainment", label: "Entertainment", description: "Movies, games, concerts, hobbies" },
  { id: "other", label: "Other", description: "Anything else that doesn't fit above" },
];

// ─── First-run demo content (Quick Tour seed / reset) ─────────────────────────

/** Occasions — stored in localStorage 'birthdays_manual'. */
export const DEMO_OCCASIONS = Object.freeze([
  { id: "demo_suman_birthday", name: "Suman", type: "birthday", month: 4, day: 8, _source: "manual" },
  { id: "demo_parents_anniversary", name: "Mom & Dad", type: "anniversary", month: 1, day: 15, _source: "manual" },
]);

/** Countdown events — stored in localStorage 'countdown_events'. */
export const DEMO_COUNTDOWN_EVENTS = Object.freeze([
  { id: "demo_salary", title: "Salary Day", targetDate: null, targetTime: "17:00", repeat: "monthly" },
]);

/** Calendar events — stored in localStorage 'widget_events'. */
export const DEMO_EVENTS = Object.freeze([
  { id: "demo_leetcode", title: "Solve LeetCode", startDate: "2030-03-15", startTime: "", endDate: "", endTime: "" },
  { id: "demo_trekking", title: "Plan Another Trekking", startDate: "2032-05-01", startTime: "", endDate: "", endTime: "" },
]);

/** Bookmark widget settings — written to widgetSettings['bookmark']. */
export const DEMO_BOOKMARK_SETTINGS = Object.freeze({
  url: MOMO_URL,
  name: "Buy Me Momo",
  iconMode: "favicon",
});

/** Pomodoro timer state — stored in localStorage 'pomodoro_timer_state_pomodoro'. */
export const DEMO_POMODORO_STATE = Object.freeze({
  phase: "timer",
  preset: "30 min",
  duration: 1800,
  remaining: 1800,
  running: true,
});

/** Notes widget settings — written to widgetSettings['notes']. */
export const DEMO_NOTES_SETTINGS = Object.freeze({
  notes: ["✅ Today's goals\n• Deep work — 2 focused blocks\n• Review PRs\n• Exercise 30 min"],
  idx: 0,
});
