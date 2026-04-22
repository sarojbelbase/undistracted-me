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
    sm: { x: 0, y: 38, w: 8, h: 8 },
    xs: { x: 8, y: 52, w: 8, h: 8 },
    xxs: { x: 0, y: 86, w: 8, h: 8 },
  },
  Component: Widget,
};
