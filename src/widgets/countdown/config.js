import { Widget } from './Widget';

export default {
  id: 'countdown',
  type: 'countdown',
  label: 'Countdown',
  x: 0, y: 5, w: 2, h: 2,
  breakpoints: {
    md: { x: 0, y: 7, w: 2, h: 2 },
    sm: { x: 0, y: 9.5, w: 2, h: 2 },
    xs: { x: 2, y: 13, w: 2, h: 2 },
    xxs: { x: 0, y: 21.5, w: 2, h: 2 },
  },
  Component: Widget,
};
