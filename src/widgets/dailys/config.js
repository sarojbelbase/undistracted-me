import { Widget } from './Widget';
import { ChatLeftQuoteFill } from 'react-bootstrap-icons';

export default {
  type: 'dailys',
  title: 'Dailys',
  category: 'info',
  icon: ChatLeftQuoteFill,
  description: 'Daily quote or interesting fact',
  enabled: true,
  platforms: {
    extension: { supported: true },
    web: { supported: true },
    phone: { supported: true },
  },
  x: 32, y: 4, w: 10, h: 8,
  breakpoints: {
    md: { x: 16, y: 20, w: 10, h: 8 },
    sm: { x: 12, y: 56, w: 12, h: 10 },
    xs: { x: 8, y: 72, w: 8, h: 12 },
    xxs: { x: 0, y: 120, w: 8, h: 14 },
  },
  Component: Widget,
};
