import { Widget } from './Widget';
import { BookmarkStarFill } from 'react-bootstrap-icons';

export default {
  type: 'bookmark',
  title: 'Bookmarks',
  category: 'tools',
  icon: BookmarkStarFill,
  description: 'Quick-access bookmarks',
  enabled: true,
  x: 8, y: 1, w: 1, h: 1,
  breakpoints: {
    md: { x: 8, y: 1, w: 2, h: 0.9 },
    sm: { x: 2, y: 3, w: 2, h: 2 },
    xs: { x: 0, y: 18, w: 2, h: 2 },
    xxs: { x: 0, y: 28.5, w: 2, h: 2 },
  },
  Component: Widget,
};
