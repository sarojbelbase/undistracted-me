import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'facts',
  type: 'facts',
  label: 'Did You Know',
  x: 0, y: 8, w: 3, h: 2,
  Component: Widget,
};
