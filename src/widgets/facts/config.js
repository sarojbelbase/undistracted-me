import { Widget } from './Widget';
import { LightbulbFill } from 'react-bootstrap-icons';

export default {
  type: 'facts',
  title: 'Did You Know',
  category: 'info',
  icon: LightbulbFill,
  description: 'Daily interesting fact',
  enabled: true,
  x: 9, y: 2, w: 3, h: 2,
  breakpoints: {
    md: { x: 7, y: 4, w: 3, h: 2 },
    sm: { x: 3, y: 6, w: 3, h: 2 },
    xs: { x: 2, y: 10.5, w: 2, h: 2 },
    xxs: { x: 0, y: 17, w: 2, h: 2 },
  },
  Component: Widget,
};
