import { Widget } from './Widget';
import { Grid3x3GapFill } from 'react-bootstrap-icons';

export default {
  type: 'quickAccess',
  title: 'Quick Access',
  category: 'tools',
  icon: Grid3x3GapFill,
  description: 'Top visited sites dock',
  enabled: true,
  x: 32, y: 0, w: 14, h: 4,
  breakpoints: {
    md: { x: 32, y: 0, w: 8, h: 4 },
    sm: { x: 8, y: 10, w: 16, h: 5 },
    xs: { x: 0, y: 22, w: 16, h: 6 },
    xxs: { x: 0, y: 56, w: 8, h: 8 },
  },
  Component: Widget,
};
