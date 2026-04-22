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
    sm: { x: 8, y: 12, w: 8, h: 8 },
    xs: { x: 0, y: 72, w: 8, h: 8 },
    xxs: { x: 0, y: 116, w: 8, h: 8 },
  },
  Component: Widget,
};
