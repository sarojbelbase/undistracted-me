import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'notes',
  type: 'notes',
  label: 'Notes',
  x: 4, y: 0, w: 2, h: 2.5,
  Component: Widget,
};
