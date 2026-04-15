import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'dateToday',
  type: 'dateToday',
  label: 'Date Today',
  x: 2, y: 0, w: 2, h: 2,
  Component: Widget,
};
