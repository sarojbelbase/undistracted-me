import { Widget } from './Widget';
import { BarChartFill } from 'react-bootstrap-icons';

export default {
  type: 'progress',
  title: 'Progress',
  category: 'time',
  icon: BarChartFill,
  description: 'Visual progress bar for the day',
  enabled: true,
  x: 16, y: 0, w: 8, h: 8,
  breakpoints: {
    md: { x: 16, y: 0, w: 8, h: 8 },
    sm: { x: 0, y: 10, w: 8, h: 10 },
    xs: { x: 8, y: 11, w: 8, h: 11 },
    xxs: { x: 0, y: 42, w: 8, h: 14 },
  },
  Component: Widget,
};
