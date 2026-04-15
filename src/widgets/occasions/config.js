import { Widget } from './Widget';
import { BalloonFill } from 'react-bootstrap-icons';

export default {
  type: 'ocasions',
  title: 'Occasions',
  category: 'planning',
  icon: BalloonFill,
  description: 'Birthdays, anniversaries & special occasions',
  enabled: true,
  x: 9, y: 4, w: 2, h: 2.5,
  breakpoints: {
    md: { x: 0, y: 4.5, w: 4, h: 2.5 },
    sm: { x: 3, y: 8, w: 3, h: 2.5 },
    xs: { x: 0, y: 13, w: 2, h: 2.5 },
    xxs: { x: 0, y: 19, w: 2, h: 2.5 },
  },
  Component: Widget,
};
