import { Widget } from './Widget';
import { HourglassSplit } from 'react-bootstrap-icons';

export default {
  type: 'countdown',
  title: 'Countdown',
  category: 'time',
  icon: HourglassSplit,
  description: 'Count down to any event',
  enabled: true,
  x: 0, y: 20, w: 8, h: 8,
  breakpoints: {
    md: { x: 0, y: 28, w: 8, h: 8 },
    sm: { x: 0, y: 32, w: 8, h: 10 },
    xs: { x: 0, y: 72, w: 8, h: 11 },
    xxs: { x: 0, y: 152, w: 8, h: 14 },
  },
  Component: Widget,
};
