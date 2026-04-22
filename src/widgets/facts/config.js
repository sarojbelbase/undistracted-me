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
    sm: { x: 12, y: 24, w: 12, h: 8 },
    xs: { x: 8, y: 42, w: 8, h: 8 },
    xxs: { x: 0, y: 68, w: 8, h: 8 },
  },
  Component: Widget,
};
