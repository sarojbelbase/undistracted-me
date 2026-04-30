import { Widget } from './Widget';
import { Rss } from 'react-bootstrap-icons';

export default {
  type: 'rss',
  title: 'News Feed',
  category: 'info',
  icon: Rss,
  description: 'RSS news headlines',
  enabled: true,
  x: 0, y: 16, w: 8, h: 10,
  breakpoints: {
    md: { x: 0, y: 24, w: 12, h: 12 },
    sm: { x: 0, y: 48, w: 12, h: 14 },
    xs: { x: 0, y: 64, w: 8, h: 16 },
    xxs: { x: 0, y: 96, w: 8, h: 16 },
  },
  Component: Widget,
};
