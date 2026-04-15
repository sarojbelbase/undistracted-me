import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'countdown',
  type: 'countdown',
  label: 'Countdown',
  x: 0, y: 5, w: 2, h: 2,
  Component: Widget,
};
