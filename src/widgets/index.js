import clockConfig from './clock/config';
import dateTodayConfig from './dateToday/config';
import dayProgressConfig from './dayProgress/config';
import eventsConfig from './events/config';
import weatherConfig from './weather/config';
import calendarConfig from './calendar/config';
import countdownConfig from './countdown/config';
import notesConfig from './notes/config';
import bookmarksConfig from './bookmarks/config';
import quickAccessConfig from './quickAccess/config';
import pomodoroConfig from './pomodoro/config';
import spotifyConfig from './spotify/config';
import factsConfig from './facts/config';
import stockConfig from './stock/config';
import occasionsConfig from './occasions/config';

export const WIDGET_TYPES = Object.freeze({
  CLOCK: 'clock',
  DATE_TODAY: 'dateToday',
  DAY_PROGRESS: 'dayProgress',
  EVENTS: 'events',
  WEATHER: 'weather',
  CALENDAR: 'calendar',
  COUNTDOWN: 'countdown',
  NOTES: 'notes',
  BOOKMARKS: 'bookmark',
  QUICK_ACCESS: 'quickAccess',
  POMODORO: 'pomodoro',
  SPOTIFY: 'spotify',
  FACTS: 'facts',
  STOCK: 'stock',
  BIRTHDAYS: 'birthdays',
});

/**
 * WIDGET_REGISTRY — assembled from each widget's config.js.
 *
 * ✅ To enable/disable a widget: set `enabled` in the widget's config.js.
 * 📐 To change grid position or size: edit `x, y, w, h` in the widget's config.js.
 * 🏷️  To change title, category, icon, description: edit the widget's config.js.
 * ➕ To add a new widget: create its config.js and add it here.
 */
export const WIDGET_REGISTRY = [
  clockConfig,
  dateTodayConfig,
  dayProgressConfig,
  countdownConfig,
  eventsConfig,
  calendarConfig,
  pomodoroConfig,
  notesConfig,
  weatherConfig,
  factsConfig,
  bookmarksConfig,
  quickAccessConfig,
  spotifyConfig,
  stockConfig,
  occasionsConfig,
];
