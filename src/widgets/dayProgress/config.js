import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'dayProgress',
  type: 'dayProgress',
  label: 'Day Progress',
  x: 2, y: 0, w: 1.8, h: 2,
  Component: Widget,
};
