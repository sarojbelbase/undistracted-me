import { Widget } from './Widget';
import { CalendarEventFill } from 'react-bootstrap-icons';

export default {
  type: 'events',
  title: 'Upcoming Events',
  category: 'planning',
  icon: CalendarEventFill,
  description: "Today's events from your calendar",
  enabled: true,
  x: 3, y: 2, w: 3.5, h: 2.5,
  breakpoints: {
    md: { x: 0, y: 2, w: 4, h: 2.5 },
    sm: { x: 0, y: 4, w: 3, h: 2.5 },
    xs: { x: 0, y: 5, w: 4, h: 2.5 },
    xxs: { x: 0, y: 9, w: 2, h: 2.5 },
  },
  Component: Widget,
};
