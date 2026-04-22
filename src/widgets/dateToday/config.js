import { Widget } from './Widget';
import { CalendarDateFill } from 'react-bootstrap-icons';

export default {
  type: 'dateToday',
  title: 'Date Today',
  category: 'time',
  icon: CalendarDateFill,
  description: 'English & Nepali date display',
  enabled: true,
  x: 8, y: 0, w: 8, h: 8,
  breakpoints: {
    md: { x: 8, y: 0, w: 8, h: 8 },
    sm: { x: 8, y: 0, w: 8, h: 8 },
    xs: { x: 8, y: 0, w: 8, h: 8 },
    xxs: { x: 0, y: 8, w: 8, h: 8 },
  },
  Component: Widget,
};
