import { Widget } from './Widget';
import { BookmarkStarFill } from 'react-bootstrap-icons';

export default {
  type: 'bookmark',
  title: 'Bookmarks',
  category: 'tools',
  icon: BookmarkStarFill,
  description: 'Quick-access bookmarks',
  enabled: true,
  x: 32, y: 4, w: 3, h: 4,
  breakpoints: {
    md: { x: 32, y: 4, w: 8, h: 4 },
    sm: { x: 8, y: 15, w: 8, h: 5 },
    xs: { x: 8, y: 111, w: 8, h: 10 },
    xxs: { x: 0, y: 202, w: 8, h: 12 },
  },
  Component: Widget,
};
