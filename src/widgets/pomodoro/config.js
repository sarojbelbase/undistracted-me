import { Widget } from './Widget';
import { PomodoroSettings } from './Settings';
import { StopwatchFill } from 'react-bootstrap-icons';

export default {
  type: 'pomodoro',
  title: 'Pomodoro',
  category: 'planning',
  icon: StopwatchFill,
  description: 'Focus timer with breaks and rain sounds',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true },
    phone: { supported: true },
  },
  x: 16, y: 18, w: 8, h: 10,
  breakpoints: {
    md: { x: 8, y: 28, w: 8, h: 10 },
    sm: { x: 8, y: 32, w: 8, h: 12 },
    xs: { x: 0, y: 83, w: 8, h: 14 },
    xxs: { x: 0, y: 166, w: 8, h: 18 },
  },
  Component: Widget,
  settingsComponent: PomodoroSettings,
};
