import { Widget } from './Widget';

export default {
  id: 'dateToday',
  type: 'dateToday',
  label: 'Date Today',
  x: 2, y: 0, w: 2, h: 2,
  breakpoints: {
    md: { x: 2, y: 0, w: 2, h: 2 },
    sm: { x: 2, y: 0, w: 2, h: 2 },
    xs: { x: 2, y: 0, w: 2, h: 2 },
    xxs: { x: 0, y: 2, w: 2, h: 2 },
  },
  Component: Widget,
};
