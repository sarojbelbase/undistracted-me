import { Widget } from './Widget';
import { StopwatchFill } from 'react-bootstrap-icons';

export default {
  type: 'pomodoro',
  title: 'Pomodoro',
  category: 'planning',
  icon: StopwatchFill,
  description: 'Focus timer (Pomodoro)',
  enabled: true,
  x: 2, y: 5, w: 2, h: 2.5,
  breakpoints: {
    md: { x: 2, y: 7, w: 2, h: 2.5 },
    sm: { x: 2, y: 9.5, w: 2, h: 2.5 },
    xs: { x: 0, y: 15.5, w: 2, h: 2.5 },
    xxs: { x: 0, y: 23.5, w: 2, h: 2.5 },
  },
  Component: Widget,
};
