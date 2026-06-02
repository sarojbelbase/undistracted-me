import { Widget } from './Widget';
import { Calendar3 } from 'react-bootstrap-icons';

export default {
  type: 'calendar',
  title: 'Calendar',
  category: 'planning',
  icon: Calendar3,
  description: 'Monthly calendar at a glance',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true },
    phone: { supported: true },
  },
  x: 8, y: 0, w: 10, h: 8,
  breakpoints: {
    md: { x: 16, y: 8, w: 12, h: 8 },
    sm: { x: 0, y: 44, w: 12, h: 10 },
    xs: { x: 0, y: 42, w: 20, h: 12 },
    xxs: { x: 0, y: 82, w: 8, h: 12 },
  },
  Component: Widget,
};
