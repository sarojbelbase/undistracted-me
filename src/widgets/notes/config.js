import { Widget } from './Widget';
import { StickyFill } from 'react-bootstrap-icons';

export default {
  type: 'notes',
  title: 'Notes',
  category: 'planning',
  icon: StickyFill,
  description: 'Quick sticky note',
  enabled: true,
  x: 28, y: 8, w: 8, h: 10,
  breakpoints: {
    md: { x: 28, y: 8, w: 12, h: 8 },
    sm: { x: 12, y: 16, w: 12, h: 8 },
    xs: { x: 0, y: 42, w: 8, h: 10 },
    xxs: { x: 0, y: 58, w: 8, h: 10 },
  },
  Component: Widget,
};
