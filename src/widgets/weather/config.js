import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'weather',
  type: 'weather',
  label: 'Weather',
  x: 3, y: 2, w: 2, h: 2,
  Component: Widget,
};
