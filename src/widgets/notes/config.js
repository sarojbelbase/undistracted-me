import { Widget } from './Widget';

export default {
  id: 'notes',
  type: 'notes',
  label: 'Notes',
  x: 7, y: 2, w: 2, h: 2.5,
  breakpoints: {
    md: { x: 7, y: 2, w: 3, h: 2 },
    sm: { x: 3, y: 4, w: 3, h: 2 },
    xs: { x: 0, y: 10.5, w: 2, h: 2.5 },
    xxs: { x: 0, y: 14.5, w: 2, h: 2.5 },
  },
  Component: Widget,
};
