import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'stock',
  type: 'stock',
  label: 'NEPSE Stock',
  x: 0, y: 10, w: 1.5, h: 2,
  Component: Widget,
};
