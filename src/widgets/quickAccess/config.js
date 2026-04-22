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
    sm: { x: 8, y: 8, w: 16, h: 4 },
    xs: { x: 0, y: 16, w: 16, h: 4 },
    xxs: { x: 0, y: 32, w: 8, h: 4 },
  },
  Component: Widget,
};
