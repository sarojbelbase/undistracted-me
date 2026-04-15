import { Widget } from './Widget';

export default {
  id: 'weather',
  type: 'weather',
  label: 'Weather',
  x: 6, y: 0, w: 2, h: 2,
  breakpoints: {
    md: { x: 6, y: 0, w: 2, h: 2 },
    sm: { x: 4, y: 0, w: 2, h: 2 },
    xs: { x: 0, y: 2, w: 2, h: 2 },
    xxs: { x: 0, y: 4, w: 2, h: 2 },
  },
  Component: Widget,
};
