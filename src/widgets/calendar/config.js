import { Widget } from './Widget';

export default {
  id: 'calendar',
  type: 'calendar',
  label: 'Calendar',
  x: 0, y: 2, w: 3, h: 3,
  breakpoints: {
    md: { x: 4, y: 2, w: 3, h: 3 },
    sm: { x: 0, y: 6.5, w: 3, h: 3 },
    xs: { x: 0, y: 7.5, w: 4, h: 3 },
    xxs: { x: 0, y: 11.5, w: 2, h: 3 },
  },
  Component: Widget,
};
