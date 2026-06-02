import { Widget } from './Widget';
import { GraphUpArrow } from 'react-bootstrap-icons';

export default {
  type: 'stock',
  title: 'Stock',
  category: 'info',
  icon: GraphUpArrow,
  description: 'NEPSE stock watchlist',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true },
    phone: { supported: true },
  },
  x: 26, y: 0, w: 7, h: 8,
  breakpoints: {
    md: { x: 28, y: 28, w: 12, h: 8 },
    sm: { x: 12, y: 44, w: 8, h: 10 },
    xs: { x: 8, y: 88, w: 8, h: 14 },
    xxs: { x: 0, y: 200, w: 8, h: 18 },
  },
  Component: Widget,
};
