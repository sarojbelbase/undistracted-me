import { Widget } from './Widget';

export default {
  id: 'bookmark',
  type: 'bookmark',
  label: 'Bookmark',
  x: 8, y: 1, w: 0.7, h: 0.9,
  breakpoints: {
    md: { x: 8, y: 1, w: 2, h: 0.9 },
    sm: { x: 2, y: 3, w: 2, h: 2 },
    xs: { x: 0, y: 18, w: 2, h: 2 },
    xxs: { x: 0, y: 28.5, w: 2, h: 2 },
  },
  Component: Widget,
};
