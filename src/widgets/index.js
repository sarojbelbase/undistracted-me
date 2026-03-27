import clockConfig from './clock/config';
import dateTodayConfig from './dateToday/config';
import dayProgressConfig from './dayProgress/config';
import eventsConfig from './events/config';
import weatherConfig from './weather/config';
import calendarConfig from './calendar/config';
import countdownConfig from './countdown/config';
import notesConfig from './notes/config';
import bookmarksConfig from './bookmarks/config';
import pomodoroConfig from './pomodoro/config';
import spotifyConfig from './spotify/config';
import factsConfig from './facts/config';
import stockConfig from './stock/config';

export { Widget as ClockWidget } from './clock/Widget';
export { Widget as DateTodayWidget } from './dateToday/Widget';
export { Widget as DayProgressWidget } from './dayProgress/Widget';
export { Widget as EventsWidget } from './events/Widget';
export { Widget as WeatherWidget } from './weather/Widget';
export { Widget as CalendarWidget } from './calendar/Widget';
export { Widget as CountdownWidget } from './countdown/Widget';
export { Widget as NotesWidget } from './notes/Widget';
export { Widget as BookmarksWidget } from './bookmarks/Widget';
export { Widget as PomodoroWidget } from './pomodoro/Widget';
export { Widget as SpotifyWidget } from './spotify/Widget';
export { Widget as FactsWidget } from './facts/Widget';
export { Widget as StockWidget } from './stock/Widget';

export const WIDGET_TYPES = Object.freeze({
  CLOCK: 'clock',
  DATE_TODAY: 'dateToday',
  DAY_PROGRESS: 'dayProgress',
  EVENTS: 'events',
  WEATHER: 'weather',
  CALENDAR: 'calendar',
  COUNTDOWN: 'countdown',
  NOTES: 'notes',
  BOOKMARKS: 'bookmarks',
  POMODORO: 'pomodoro',
  SPOTIFY: 'spotify',
  FACTS: 'facts',
  STOCK: 'stock',
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
  { ...spotifyConfig, enabled: true, category: 'tools', icon: 'MusicNoteBeamed', description: 'Spotify playback controls' },
  { ...stockConfig, enabled: true, category: 'info', icon: 'GraphUpArrow', description: 'NEPSE stock watchlist' },
];
