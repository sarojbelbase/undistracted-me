export const WIDGET_TYPES = Object.freeze({
  CLOCK: 'clock',
  DAY_PROGRESS: 'dayProgress',
  EVENTS: 'events',
  WEATHER: 'weather',
  CALENDAR: 'calendar',
  COUNTDOWN: 'countdown'
});

export const DEFAULT_WIDGETS = [
  { id: 'clock-1', type: WIDGET_TYPES.CLOCK, enabled: true },
  { id: 'dayProgress-1', type: WIDGET_TYPES.DAY_PROGRESS, enabled: true },
  { id: 'events-1', type: WIDGET_TYPES.EVENTS, enabled: true },
  { id: 'weather-1', type: WIDGET_TYPES.WEATHER, enabled: true },
  { id: 'calendar-1', type: WIDGET_TYPES.CALENDAR, enabled: true },
  { id: 'countdown-1', type: WIDGET_TYPES.COUNTDOWN, enabled: true }
];
