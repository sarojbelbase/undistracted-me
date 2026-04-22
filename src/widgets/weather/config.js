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
    sm: { x: 16, y: 0, w: 8, h: 8 },
    xs: { x: 0, y: 8, w: 8, h: 8 },
    xxs: { x: 0, y: 16, w: 8, h: 8 },
  },
  Component: Widget,
};
