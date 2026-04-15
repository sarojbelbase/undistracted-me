import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'calendar',
  type: 'calendar',
  label: 'Calendar',
  x: 0, y: 4, w: 3, h: 3,
  Component: Widget,
};
