import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'spotify',
  type: 'spotify',
  label: 'Spotify',
  x: 0, y: 9, w: 2, h: 2.5,
  Component: Widget,
};
