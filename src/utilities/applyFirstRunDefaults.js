/**
 * Applies first-run widget defaults.
 *
 * Two entry points:
 *   applyFirstRunDefaults()           — called from seedWidgetInstancesIfEmpty()
 *                                       immediately after fresh instance seeding.
 *                                       Runs BEFORE widgets mount so all local
 *                                       React state initialises with demo data.
 *                                       Writes to localStorage AND updates Zustand.
 *
 *   applyFirstRunDefaultsToStorage()  — localStorage-only, called inside
 *                                       resetSettings() before window.location.reload().
 */

import {
  DEMO_OCCASIONS,
  DEMO_COUNTDOWN_EVENTS,
  DEMO_EVENTS,
  DEMO_BOOKMARK_SETTINGS,
  DEMO_POMODORO_STATE,
  DEMO_NOTES_SETTINGS,
} from '../constants/defaults';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { useWidgetInstancesStore } from '../store/useWidgetInstancesStore';

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Returns the YYYY-MM-DD string for the last day of the next-coming month-end.
 *  e.g. called on May 16 → "2026-05-31"; called on May 31 → "2026-06-30". */
function nextSalaryDate() {
  const now = new Date();
  const lastOfThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const today = now.getDate();
  const base = today < lastOfThisMonth.getDate() ? lastOfThisMonth
    : new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Merge demo items into an existing array, replacing any prior demo entries by id. */
function mergeById(existing, demos) {
  const demoIds = new Set(demos.map(d => String(d.id)));
  return [...existing.filter(e => !demoIds.has(String(e.id))), ...demos];
}

function safeLoad(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

// ── localStorage layer (shared by both entry points) ─────────────────────────

function writeOccasions() {
  const existing = safeLoad('birthdays_manual', []);
  localStorage.setItem('birthdays_manual', JSON.stringify(mergeById(existing, DEMO_OCCASIONS)));
}

function writeCountdown() {
  const existing = safeLoad(STORAGE_KEYS.COUNTDOWN_EVENTS, []);
  const salaryEvent = { ...DEMO_COUNTDOWN_EVENTS[0], targetDate: nextSalaryDate() };
  localStorage.setItem(STORAGE_KEYS.COUNTDOWN_EVENTS, JSON.stringify(mergeById(existing, [salaryEvent])));
}

function writeEvents() {
  const existing = safeLoad(STORAGE_KEYS.EVENTS, []);
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(mergeById(existing, DEMO_EVENTS)));
}

function writeBookmarkToStorage() {
  localStorage.setItem(
    STORAGE_KEYS.widgetSettings('bookmark'),
    JSON.stringify(DEMO_BOOKMARK_SETTINGS),
  );
}

function writePomodoroToStorage() {
  localStorage.setItem(
    STORAGE_KEYS.pomodoroTimerState('pomodoro'),
    JSON.stringify(DEMO_POMODORO_STATE),
  );
}

function writeNotesToStorage() {
  localStorage.setItem(
    STORAGE_KEYS.widgetSettings('notes'),
    JSON.stringify(DEMO_NOTES_SETTINGS),
  );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * localStorage-only write used by resetSettings() (before page reload).
 * Writes all demo data fresh — existing widget data has already been cleared.
 */
export function applyFirstRunDefaultsToStorage() {
  localStorage.setItem('birthdays_manual', JSON.stringify(DEMO_OCCASIONS));
  const salaryEvent = { ...DEMO_COUNTDOWN_EVENTS[0], targetDate: nextSalaryDate() };
  localStorage.setItem(STORAGE_KEYS.COUNTDOWN_EVENTS, JSON.stringify([salaryEvent]));
  localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(DEMO_EVENTS));
  writeBookmarkToStorage();
  writePomodoroToStorage();
  writeNotesToStorage();
}

/**
 * Called from seedWidgetInstancesIfEmpty() right after fresh instance seeding.
 * Runs before widgets first mount so all local React state initialises with
 * demo data — no reload required.
 */
export function applyFirstRunDefaults() {
  // ── Write to localStorage ──
  writeOccasions();
  writeCountdown();
  writeEvents();
  writeBookmarkToStorage();
  writePomodoroToStorage();
  writeNotesToStorage();

  // Notify the events widget cache (it listens to this custom event).
  try { globalThis.dispatchEvent(new Event('widget_events_changed')); } catch { /* noop */ }

  // ── Update Zustand store so widgets see data on their first render ──
  try {
    const { updateWidgetSetting } = useWidgetInstancesStore.getState();

    // Bookmark
    updateWidgetSetting('bookmark', 'url', DEMO_BOOKMARK_SETTINGS.url);
    updateWidgetSetting('bookmark', 'name', DEMO_BOOKMARK_SETTINGS.name);
    updateWidgetSetting('bookmark', 'iconMode', DEMO_BOOKMARK_SETTINGS.iconMode);

    // Notes
    updateWidgetSetting('notes', 'notes', DEMO_NOTES_SETTINGS.notes);
    updateWidgetSetting('notes', 'idx', DEMO_NOTES_SETTINGS.idx);
  } catch { /* store not available (SSR / test env) */ }
}
