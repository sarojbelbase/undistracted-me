import { Widget } from './Widget';

export default {
  id: 'dayProgress',
  type: 'dayProgress',
  label: 'Day Progress',
  x: 4, y: 0, w: 1.8, h: 2,
  breakpoints: {
    md: { x: 4, y: 0, w: 2, h: 2 },
    sm: { x: 0, y: 2, w: 2, h: 2 },
    xs: { x: 2, y: 2, w: 2, h: 2 },
    xxs: { x: 0, y: 6, w: 2, h: 2 },
  },
  Component: Widget,
};
