import { lazy, Suspense } from 'react';
import { GridPosition } from '../types';
import { Widget, WidgetDefinition, WidgetProps } from '../types/widgets';

import { WidgetSkeleton } from '../components/WidgetSkeleton';

const WeatherWidget = lazy(() => import('./WeatherWidget'));
const EventsWidget = lazy(() => import('./EventsWidget'));
const TimerWidget = lazy(() => import('./TimerWidget'));
const DateTodayWidget = lazy(() => import('./DateTodayWidget'));
const CalendarWidget = lazy(() => import('./CalendarWidget'));
const DayProgressWidget = lazy(() => import('./DayProgressWidget'));

export const availableWidgets: WidgetDefinition[] = [
  {
    id: 'date-today',
    type: 'date-today',
    title: 'Date Today',
    component: DateTodayWidget,
    defaultSettings: {},
    defaultSize: { w: 2, h: 2 },
    order: 1
  },
  {
    id: 'day-progress',
    type: 'day-progress',
    title: 'Day Progress',
    component: DayProgressWidget,
    defaultSettings: {
      dotColorActive: 'bg-accent-2',
      dotColorInactive: 'bg-gray-200'
    },
    defaultSize: { w: 2, h: 2 },
    order: 2
  },
  {
    id: 'calendar',
    type: 'calendar',
    title: 'Calendar',
    component: CalendarWidget,
    defaultSettings: {},
    defaultSize: { w: 4, h: 2 },
    order: 3
  },
  {
    id: 'events',
    type: 'events',
    title: 'Events',
    component: EventsWidget,
    defaultSettings: {},
    defaultSize: { w: 4, h: 4 },
    order: 4
  },
  {
    id: 'weather',
    type: 'weather',
    title: 'Weather',
    component: WeatherWidget,
    defaultSettings: {},
    defaultSize: { w: 2, h: 2 },
    order: 5
  },
  {
    id: 'timer',
    type: 'timer',
    title: 'Timer',
    component: TimerWidget,
    defaultSettings: {
      duration: 30 * 60
    },
    defaultSize: { w: 2, h: 2 },
    order: 6
  }
];

export type WidgetType = typeof availableWidgets[number]['type'];

export const calculateGridPositions = (widgets: Widget[]): Record<string, GridPosition> => {
  const positions: Record<string, GridPosition> = {};

  // Sort widgets by order
  const sortedWidgets = [...widgets].sort((a, b) => {
    const aWidget = availableWidgets.find(w => w.type === a.type);
    const bWidget = availableWidgets.find(w => w.type === b.type);
    return (aWidget?.order ?? 0) - (bWidget?.order ?? 0);
  });

  let currentRow = 0;
  let currentCol = 0;

  sortedWidgets.forEach(widget => {
    const def = availableWidgets.find(w => w.type === widget.type);
    if (!def) return;

    // If widget doesn't fit in current row, move to next row
    if (currentCol + def.defaultSize.w > 12) {
      currentCol = 0;
      currentRow += 2;
    }

    positions[widget.id] = {
      x: currentCol,
      y: currentRow,
      w: def.defaultSize.w,
      h: def.defaultSize.h
    };

    currentCol += def.defaultSize.w;
  });

  return positions;
};

export const renderWidget = (widget: Widget, props: WidgetProps) => {
  const widgetDef = availableWidgets.find((w) => w.type === widget.type);
  if (!widgetDef) return null;

  const Component = widgetDef.component;
  return (
    <Suspense fallback={<WidgetSkeleton />}>
      <Component {...props} />
    </Suspense>
  );
};
