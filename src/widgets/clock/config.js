import { Widget } from './Widget';
import { ClockFill } from 'react-bootstrap-icons';

export default {
  type: 'clock',
  title: 'Clock',
  category: 'time',
  icon: ClockFill,
  description: 'Live clock with extra time zones',
  enabled: true,
  x: 0, y: 0, w: 8, h: 8,
  breakpoints: {
    md: { x: 0, y: 0, w: 8, h: 8 },
    sm: { x: 0, y: 0, w: 8, h: 8 },
    xs: { x: 0, y: 0, w: 8, h: 8 },
    xxs: { x: 0, y: 0, w: 8, h: 8 },
  },
  Component: Widget,
};
