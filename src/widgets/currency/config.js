import { Widget } from './Widget';
import { CurrencyExchange } from 'react-bootstrap-icons';

export default {
  type: 'currency',
  title: 'Rates',
  category: 'info',
  icon: CurrencyExchange,
  description: 'Currency & gold rates (NPR)',
  enabled: true,
  x: 12, y: 16, w: 10, h: 11,
  breakpoints: {
    md: { x: 12, y: 24, w: 10, h: 11 },
    sm: { x: 0, y: 40, w: 12, h: 12 },
    xs: { x: 0, y: 56, w: 8, h: 14 },
    xxs: { x: 0, y: 80, w: 8, h: 16 },
  },
  Component: Widget,
};
