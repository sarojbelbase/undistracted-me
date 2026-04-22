import { Widget } from './Widget';
import { BalloonFill } from 'react-bootstrap-icons';

export default {
  type: 'ocasions',
  title: 'Occasions',
  category: 'planning',
  icon: BalloonFill,
  description: 'Birthdays, anniversaries & special occasions',
  enabled: true,
  x: 36, y: 16, w: 8, h: 10,
  breakpoints: {
    md: { x: 0, y: 18, w: 16, h: 10 },
    sm: { x: 12, y: 32, w: 12, h: 10 },
    xs: { x: 0, y: 52, w: 8, h: 10 },
    xxs: { x: 0, y: 76, w: 8, h: 10 },
  },
  Component: Widget,
};
