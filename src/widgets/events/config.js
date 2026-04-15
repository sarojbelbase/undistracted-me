import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'events',
  type: 'events',
  label: 'Upcoming Events',
  x: 4, y: 0, w: 3.5, h: 2.5,
  Component: Widget,
};
