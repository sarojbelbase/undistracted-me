import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'pomodoro',
  type: 'pomodoro',
  label: 'Pomodoro',
  x: 4, y: 3, w: 2, h: 2.5,
  Component: Widget,
};
