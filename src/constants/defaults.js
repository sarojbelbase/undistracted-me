/**
 * First-run default data seeded into widgets when the user completes the Quick Tour
 * for the first time, and re-applied when the user resets via the Widget Catalog.
 *
 */

// ── Occasions (manual birthdays/anniversaries) ─────────────────────────────
// Stored in localStorage key: 'birthdays_manual'
export const DEMO_OCCASIONS = [
  {
    id: 'demo_suman_birthday',
    name: 'Suman',
    type: 'birthday',
    month: 4,    // April ≈ Chaitra
    day: 8,      // 8th ≈ Chaitra 26
    _source: 'manual',
  },
  {
    id: 'demo_parents_anniversary',
    name: 'Mom & Dad',
    type: 'anniversary',
    month: 1,    // January ≈ Magh
    day: 15,     // 15th ≈ Magh 2
    _source: 'manual',
  },
];

// ── Countdown events ────────────────────────────────────────────────────────
// Stored in localStorage key: 'countdown_events'
// targetDate is filled at apply-time (next last-day-of-month) so it's always fresh.
export const DEMO_COUNTDOWN_EVENTS = [
  {
    id: 'demo_salary',
    title: 'Salary Day',
    targetDate: null,   // computed at apply-time
    targetTime: '17:00',
    repeat: 'monthly',
  },
];

// ── Calendar events ─────────────────────────────────────────────────────────
// Stored in localStorage key: 'widget_events'
export const DEMO_EVENTS = [
  {
    id: 'demo_leetcode',
    title: 'Solve LeetCode',
    startDate: '2030-03-15',
    startTime: '',
    endDate: '',
    endTime: '',
  },
  {
    id: 'demo_trekking',
    title: 'Plan Another Trekking',
    startDate: '2032-05-01',
    startTime: '',
    endDate: '',
    endTime: '',
  },
];

// ── Bookmark widget settings ─────────────────────────────────────────────────
// Written to widgetSettings['bookmark'] in the instances store.
export const DEMO_BOOKMARK_SETTINGS = {
  url: 'https://buymemomo.com/sarojbelbase',
  name: 'Buy Me Momo',
  iconMode: 'favicon',
};



// ── Pomodoro timer state ─────────────────────────────────────────────────────
// Stored in localStorage key: 'pomodoro_timer_state_pomodoro'
// Phase 'timer' with 30-min preset pre-selected but not yet running.
export const DEMO_POMODORO_STATE = {
  phase: 'timer',
  preset: '30 min',
  duration: 1800,
  remaining: 1800,
  running: true,
};

// ── Notes widget settings ────────────────────────────────────────────────────
// Written to widgetSettings['notes'] in the instances store.
export const DEMO_NOTES_SETTINGS = {
  notes: [
    '✅ Today\'s goals\n• Deep work — 2 focused blocks\n• Review PRs\n• Exercise 30 min',
  ],
  idx: 0,
};
