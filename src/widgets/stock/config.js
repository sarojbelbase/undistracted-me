import { Widget } from './Widget';
import { GraphUpArrow } from 'react-bootstrap-icons';

export default {
  type: 'stock',
  title: 'Stock',
  category: 'info',
  icon: GraphUpArrow,
  description: 'NEPSE stock watchlist',
  enabled: true,
  x: 7, y: 5, w: 1.5, h: 2,
  breakpoints: {
    md: { x: 7, y: 7, w: 3, h: 2 },
    sm: { x: 0, y: 11.5, w: 2, h: 2 },
    xs: { x: 2, y: 18, w: 2, h: 2 },
    xxs: { x: 0, y: 30.5, w: 2, h: 2 },
  },
  Component: Widget,
};
