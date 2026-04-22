import { Widget } from './Widget';
import { StopwatchFill } from 'react-bootstrap-icons';

export default {
  type: 'pomodoro',
  title: 'Pomodoro',
  category: 'planning',
  icon: StopwatchFill,
  description: 'Focus timer (Pomodoro)',
  enabled: true,
  x: 8, y: 20, w: 8, h: 10,
  breakpoints: {
    md: { x: 8, y: 28, w: 8, h: 10 },
    sm: { x: 8, y: 38, w: 8, h: 10 },
    xs: { x: 0, y: 62, w: 8, h: 10 },
    xxs: { x: 0, y: 94, w: 8, h: 10 },
  },
  Component: Widget,
};
