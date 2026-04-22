import { Widget } from './Widget';
import { GraphUpArrow } from 'react-bootstrap-icons';

export default {
  type: 'stock',
  title: 'Stock',
  category: 'info',
  icon: GraphUpArrow,
  description: 'NEPSE stock watchlist',
  enabled: true,
  x: 28, y: 20, w: 7, h: 8,
  breakpoints: {
    md: { x: 28, y: 28, w: 12, h: 8 },
    sm: { x: 0, y: 46, w: 8, h: 8 },
    xs: { x: 8, y: 72, w: 8, h: 8 },
    xxs: { x: 0, y: 122, w: 8, h: 8 },
  },
  Component: Widget,
};
