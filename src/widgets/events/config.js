import { Widget } from './Widget';
import { CalendarEventFill } from 'react-bootstrap-icons';

export default {
  type: 'events',
  title: 'Upcoming Events',
  category: 'planning',
  icon: CalendarEventFill,
  description: "Today's events from your calendar",
  enabled: true,
  x: 12, y: 8, w: 14, h: 10,
  breakpoints: {
    md: { x: 0, y: 8, w: 16, h: 10 },
    sm: { x: 0, y: 20, w: 12, h: 12 },
    xs: { x: 0, y: 28, w: 16, h: 14 },
    xxs: { x: 0, y: 64, w: 8, h: 18 },
  },
  Component: Widget,
};
