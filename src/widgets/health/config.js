import { Widget } from './Widget';
import { HeartPulseFill } from 'react-bootstrap-icons';

export default {
  type: 'health',
  title: 'Health',
  category: 'info',
  icon: HeartPulseFill,
  description: 'Daily steps, sleep & active minutes',
  enabled: true,
  x: 0, y: 20, w: 7, h: 9,
  breakpoints: {
    md:  { x: 20, y: 28, w: 12, h: 9 },
    sm:  { x: 0,  y: 69, w: 8,  h: 11 },
    xs:  { x: 8,  y: 93, w: 8,  h: 13 },
    xxs: { x: 0,  y: 224, w: 8, h: 17 },
  },
  Component: Widget,
};
