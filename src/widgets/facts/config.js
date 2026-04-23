import { Widget } from './Widget';
import { LightbulbFill } from 'react-bootstrap-icons';

export default {
  type: 'facts',
  title: 'Did You Know',
  category: 'info',
  icon: LightbulbFill,
  description: 'Daily interesting fact',
  enabled: true,
  x: 36, y: 8, w: 12, h: 8,
  breakpoints: {
    md: { x: 28, y: 16, w: 12, h: 8 },
    sm: { x: 12, y: 56, w: 12, h: 10 },
    xs: { x: 8, y: 72, w: 8, h: 11 },
    xxs: { x: 0, y: 120, w: 8, h: 14 },
  },
  Component: Widget,
};
