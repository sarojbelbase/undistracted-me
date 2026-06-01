/**
 * Pomodoro widget — constants, option arrays, and display maps.
 *
 * Never inline these in JSX. Import from here so Settings and Widget
 * stay in sync and option labels are a single source of truth.
 */

// ── Timer presets ────────────────────────────────────────────────────────────
// secs: null → triggers the "Custom" input instead of starting a timer.

export const PRESETS = [
  { label: '25 min', secs: 25 * 60 },
  { label: '30 min', secs: 30 * 60 },
  { label: '1 hr', secs: 60 * 60 },
  { label: 'Custom', secs: null },
];

// ── Break durations (minutes) ────────────────────────────────────────────────

export const BREAK_OPTIONS = [
  { label: '5 min', mins: 5 },
  { label: '10 min', mins: 10 },
  { label: '15 min', mins: 15 },
];

// ── Timer phases ─────────────────────────────────────────────────────────────

export const PHASE = Object.freeze({
  PICK: 'pick',
  TIMER: 'timer',
  BREAK: 'break',
});

// ── Session types ────────────────────────────────────────────────────────────

export const SESSION_TYPE = Object.freeze({
  FOCUS: 'focus',
  BREAK: 'break',
});

// ── Default per-widget settings (merged with user overrides) ─────────────────

export const DEFAULT_SETTINGS = Object.freeze({
  soundEnabled: true,
  autoBreak: false,
  breakDuration: 5,   // minutes
  rainSound: false,
});

// ── History ──────────────────────────────────────────────────────────────────

export const MAX_HISTORY = 500;
export const HISTORY_STORAGE_KEY = 'pomodoro_history';
