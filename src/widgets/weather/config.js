import { Widget } from './Widget';
import { CloudSunFill } from 'react-bootstrap-icons';

export default {
  type: 'weather',
  title: 'Weather',
  category: 'info',
  icon: CloudSunFill,
  description: 'Local weather & forecast',
  enabled: true,
  x: 24, y: 0, w: 8, h: 8,
  breakpoints: {
    md: { x: 24, y: 0, w: 8, h: 8 },
    sm: { x: 16, y: 0, w: 8, h: 10 },
    xs: { x: 0, y: 11, w: 8, h: 11 },
    xxs: { x: 0, y: 28, w: 8, h: 14 },
  },
  Component: Widget,
};
