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
 * ✅ To enable/disable a widget: change `enabled` here.
 * 📐 To change grid position or size: edit the widget's config.js.
 * ➕ To add a new widget: add its config to this list.
 */
export const WIDGET_REGISTRY = [
  { ...clockConfig, enabled: true, category: 'time', icon: 'ClockFill', description: 'Live clock with extra time zones' },
  { ...dateTodayConfig, enabled: true, category: 'time', icon: 'CalendarDateFill', description: 'English & Nepali date display' },
  { ...dayProgressConfig, enabled: true, category: 'time', icon: 'BarChartFill', description: "Visual progress bar for the day" },
  { ...countdownConfig, enabled: true, category: 'time', icon: 'HourglassSplit', description: 'Count down to any event' },
  { ...eventsConfig, enabled: true, category: 'planning', icon: 'CalendarEventFill', description: "Today's events from your calendar" },
  { ...calendarConfig, enabled: true, category: 'planning', icon: 'Calendar3', description: 'Monthly calendar at a glance' },
  { ...pomodoroConfig, enabled: true, category: 'planning', icon: 'StopwatchFill', description: 'Focus timer (Pomodoro)' },
  { ...notesConfig, enabled: true, category: 'planning', icon: 'StickyFill', description: 'Quick sticky note' },
  { ...weatherConfig, enabled: true, category: 'info', icon: 'CloudSunFill', description: 'Local weather & forecast' },
  { ...factsConfig, enabled: true, category: 'info', icon: 'LightbulbFill', description: 'Daily interesting fact' },
  { ...bookmarksConfig, enabled: true, category: 'tools', icon: 'BookmarkStarFill', description: 'Quick-access bookmarks' },
  { ...quickAccessConfig, enabled: true, category: 'tools', icon: 'Grid3x3GapFill', description: 'Top visited sites dock' },
  { ...spotifyConfig, enabled: true, category: 'tools', icon: 'MusicNoteBeamed', description: 'Spotify playback controls' },
  { ...stockConfig, enabled: true, category: 'info', icon: 'GraphUpArrow', description: 'NEPSE stock watchlist' },
  { ...occasionsConfig, enabled: true, category: 'planning', icon: 'BalloonFill', description: 'Birthdays, anniversaries & special occasions' },
];
