import { Widget } from './Widget';
import { Calendar3 } from 'react-bootstrap-icons';

export default {
  type: 'calendar',
  title: 'Calendar',
  category: 'planning',
  icon: Calendar3,
  description: 'Monthly calendar at a glance',
  enabled: true,
  x: 0, y: 8, w: 12, h: 12,
  breakpoints: {
    md: { x: 16, y: 8, w: 12, h: 12 },
    sm: { x: 0, y: 26, w: 12, h: 12 },
    xs: { x: 0, y: 30, w: 16, h: 12 },
    xxs: { x: 0, y: 46, w: 8, h: 12 },
  },
  Component: Widget,
};
