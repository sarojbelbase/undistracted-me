import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'clock',
  type: 'clock',
  label: 'Clock',
  x: 0, y: 0, w: 2, h: 2,
  Component: Widget,
};
