import { Widget } from './Widget';
import { BarChartFill } from 'react-bootstrap-icons';

export default {
  type: 'dayProgress',
  title: 'Day Progress',
  category: 'time',
  icon: BarChartFill,
  description: 'Visual progress bar for the day',
  enabled: true,
  x: 4, y: 0, w: 2, h: 2,
  breakpoints: {
    md: { x: 4, y: 0, w: 2, h: 2 },
    sm: { x: 0, y: 2, w: 2, h: 2 },
    xs: { x: 2, y: 2, w: 2, h: 2 },
    xxs: { x: 0, y: 6, w: 2, h: 2 },
  },
  Component: Widget,
};
