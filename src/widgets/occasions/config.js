import { Widget } from './Widget';
import { BalloonFill } from 'react-bootstrap-icons';

export default {
  type: 'occasions',
  title: 'Occasions',
  category: 'planning',
  icon: BalloonFill,
  description: 'Birthdays, anniversaries & special occasions',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: 'partial', limitations: ['Google Contacts auto-sync unavailable'] },
    phone: { supported: 'partial', limitations: ['Google Contacts auto-sync unavailable'] },
  },
  x: 16, y: 8, w: 8, h: 10,
  breakpoints: {
    md: { x: 0, y: 18, w: 16, h: 10 },
    sm: { x: 12, y: 44, w: 12, h: 12 },
    xs: { x: 0, y: 97, w: 8, h: 14 },
    xxs: { x: 0, y: 134, w: 8, h: 18 },
  },
  Component: Widget,
};
