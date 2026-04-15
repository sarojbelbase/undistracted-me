import { Widget } from './Widget';
import { CalendarDateFill } from 'react-bootstrap-icons';

export default {
  type: 'dateToday',
  title: 'Date Today',
  category: 'time',
  icon: CalendarDateFill,
  description: 'English & Nepali date display',
  enabled: true,
  x: 2, y: 0, w: 2, h: 2,
  breakpoints: {
    md: { x: 2, y: 0, w: 2, h: 2 },
    sm: { x: 2, y: 0, w: 2, h: 2 },
    xs: { x: 2, y: 0, w: 2, h: 2 },
    xxs: { x: 0, y: 2, w: 2, h: 2 },
  },
  Component: Widget,
};
