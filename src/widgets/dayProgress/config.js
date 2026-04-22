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
    sm: { x: 0, y: 8, w: 8, h: 8 },
    xs: { x: 8, y: 8, w: 8, h: 8 },
    xxs: { x: 0, y: 24, w: 8, h: 8 },
  },
  Component: Widget,
};
