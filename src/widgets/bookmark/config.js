import { Widget } from './Widget';
import { BookmarkStarFill } from 'react-bootstrap-icons';

export default {
  type: 'bookmark',
  title: 'Bookmark',
  category: 'tools',
  icon: BookmarkStarFill,
  description: 'Quick-access bookmarks',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true },
    phone: { supported: true },
  },
  x: 37, y: 18, w: 3, h: 4,
  breakpoints: {
    md: { x: 32, y: 4, w: 4, h: 4 },
    sm: { x: 8, y: 10, w: 4, h: 6 },
    xs: { x: 8, y: 102, w: 8, h: 11 },
    xxs: { x: 0, y: 218, w: 8, h: 14 },
  },
  Component: Widget,
};
