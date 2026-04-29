import { Widget } from './Widget';
import { ChatLeftQuoteFill } from 'react-bootstrap-icons';

export default {
  type: 'quotes',
  title: 'Daily Quote',
  category: 'info',
  icon: ChatLeftQuoteFill,
  description: 'Daily inspiring quote',
  enabled: true,
  x: 24, y: 8, w: 12, h: 9,
  breakpoints: {
    md: { x: 16, y: 16, w: 12, h: 9 },
    sm: { x: 12, y: 56, w: 12, h: 11 },
    xs: { x: 8, y: 72, w: 8, h: 12 },
    xxs: { x: 0, y: 120, w: 8, h: 15 },
  },
  Component: Widget,
};
