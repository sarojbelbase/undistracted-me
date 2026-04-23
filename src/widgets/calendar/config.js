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
    sm: { x: 0, y: 44, w: 12, h: 15 },
    xs: { x: 0, y: 42, w: 16, h: 16 },
    xxs: { x: 0, y: 82, w: 8, h: 20 },
  },
  Component: Widget,
};
