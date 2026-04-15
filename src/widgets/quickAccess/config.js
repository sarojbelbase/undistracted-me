import { Widget } from './Widget';

export default {
  id: 'quickAccess',
  type: 'quickAccess',
  label: 'Quick Access',
  x: 8, y: 0, w: 3.5, h: 1,
  breakpoints: {
    md: { x: 8, y: 0, w: 2, h: 1 },
    sm: { x: 2, y: 2, w: 4, h: 1 },
    xs: { x: 0, y: 4, w: 4, h: 1 },
    xxs: { x: 0, y: 8, w: 2, h: 1 },
  },
  Component: Widget,
};
