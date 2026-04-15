import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'quickAccess',
  type: 'quickAccess',
  label: 'Quick Access',
  x: 0, y: 0, w: 3.5, h: 1,
  Component: Widget,
};
