import clockConfig from './clock/config';
import dateTodayConfig from './dateToday/config';
import dayProgressConfig from './dayProgress/config';
import eventsConfig from './events/config';
import weatherConfig from './weather/config';
import calendarConfig from './calendar/config';
import countdownConfig from './countdown/config';

export { Widget as ClockWidget } from './clock/Widget';
export { Widget as DateTodayWidget } from './dateToday/Widget';
export { Widget as DayProgressWidget } from './dayProgress/Widget';
export { Widget as EventsWidget } from './events/Widget';
export { Widget as WeatherWidget } from './weather/Widget';
export { Widget as CalendarWidget } from './calendar/Widget';
export { Widget as CountdownWidget } from './countdown/Widget';

export const WIDGET_TYPES = Object.freeze({
  CLOCK: 'clock',
  DATE_TODAY: 'dateToday',
  DAY_PROGRESS: 'dayProgress',
  EVENTS: 'events',
  WEATHER: 'weather',
  CALENDAR: 'calendar',
  COUNTDOWN: 'countdown',
});

/**
 * WIDGET_REGISTRY — assembled from each widget's config.js.
 *
 * ✅ To enable/disable a widget: change `enabled` here.
 * 📐 To change grid position or size: edit the widget's config.js.
 * ➕ To add a new widget: add its config to this list.
 */
export const WIDGET_REGISTRY = [
  { ...clockConfig, enabled: true },
  { ...dateTodayConfig, enabled: true },
  { ...dayProgressConfig, enabled: true },
  { ...eventsConfig, enabled: true },
  { ...weatherConfig, enabled: true },
  { ...calendarConfig, enabled: true },
  { ...countdownConfig, enabled: true },
];
