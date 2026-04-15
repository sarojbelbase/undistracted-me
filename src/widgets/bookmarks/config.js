import { lazy } from 'react';
const Widget = lazy(() => import('./Widget').then(m => ({ default: m.Widget })));

export default {
  id: 'bookmark',
  type: 'bookmark',
  label: 'Bookmark',
  x: 0, y: 4, w: 0.7, h: 0.9,
  Component: Widget,
};
