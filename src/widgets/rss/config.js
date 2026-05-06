import { Widget } from './Widget';
import { Rss } from 'react-bootstrap-icons';

export default {
  type: 'rss',
  title: 'News Feed',
  category: 'info',
  icon: Rss,
  description: 'RSS news headlines',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true, limitations: ['Background sync unavailable on web'] },
    phone: { supported: true, limitations: ['Background sync unavailable on mobile'] },
  },
  x: 26, y: 18, w: 8, h: 10,
  breakpoints: {
    md: { x: 0, y: 38, w: 12, h: 12 },
    sm: { x: 0, y: 66, w: 12, h: 14 },
    xs: { x: 0, y: 72, w: 8, h: 16 },
    xxs: { x: 0, y: 152, w: 8, h: 16 },
  },
  Component: Widget,
};
