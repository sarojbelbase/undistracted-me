import React, { useState, useCallback } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import {
  WIDGET_TYPES,
  WIDGET_REGISTRY,
  ClockWidget,
  DateTodayWidget,
  DayProgressWidget,
  EventsWidget,
  WeatherWidget,
  CalendarWidget,
  CountdownWidget,
} from './index';

// Derived at module load — change enabled/positions in each widget's config.js or index.js
const ACTIVE_WIDGETS = WIDGET_REGISTRY.filter(w => w.enabled);
const DEFAULT_LAYOUT = ACTIVE_WIDGETS.map(({ id, x, y, w, h, minW, minH }) => ({
  i: id, x, y, w, h, minW, minH,
}));

const LAYOUT_KEY = 'widget_grid_layouts'; // keyed by breakpoint

const DEFAULT_LAYOUTS = {
  lg: DEFAULT_LAYOUT,
};

const loadLayouts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    // Must be an object with at least one breakpoint array
    if (saved && typeof saved === 'object' && !Array.isArray(saved) && Object.keys(saved).length) {
      return { ...DEFAULT_LAYOUTS, ...saved };
    }
  } catch { /* ignore */ }
  return DEFAULT_LAYOUTS;
};

const renderWidget = (widget) => {
  switch (widget.type) {
    case WIDGET_TYPES.CLOCK: return <ClockWidget widgetId={widget.id} />;
    case WIDGET_TYPES.DATE_TODAY: return <DateTodayWidget widgetId={widget.id} />;
    case WIDGET_TYPES.DAY_PROGRESS: return <DayProgressWidget />;
    case WIDGET_TYPES.EVENTS: return <EventsWidget />;
    case WIDGET_TYPES.WEATHER: return <WeatherWidget />;
    case WIDGET_TYPES.CALENDAR: return <CalendarWidget />;
    case WIDGET_TYPES.COUNTDOWN: return <CountdownWidget />;
    default: return null;
  }
};

export const WidgetGrid = () => {
  const { width, containerRef, mounted } = useContainerWidth();
  const [layouts, setLayouts] = useState(loadLayouts);
  const [draggingId, setDraggingId] = useState(null);

  // onLayoutChange receives (currentLayout, allLayouts) — save allLayouts so each
  // breakpoint keeps its own positions independently
  const handleLayoutChange = useCallback((_current, allLayouts) => {
    setLayouts(allLayouts);
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(allLayouts));
  }, []);

  const handleDragStart = useCallback((_layout, oldItem) => {
    setDraggingId(oldItem.i);
  }, []);

  const handleDragStop = useCallback(() => {
    setDraggingId(null);
  }, []);

  const isDragging = draggingId !== null;

  return (
    <div className="w-full h-full p-4 relative" ref={containerRef}>
      {/* Dot-grid overlay — fades in when dragging; color adapts via dark mode CSS */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-200 drag-dot-overlay"
        style={{ opacity: isDragging ? 1 : 0 }}
      />
      {mounted && (
        <Responsive
          className="layout"
          layouts={layouts}
          width={width}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={75}
          isDraggable={true}
          isResizable={false}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          useCSSTransforms={true}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
        >
          {ACTIVE_WIDGETS.map(widget => (
            <div
              key={widget.id}
              className="w-full h-full transition-opacity duration-200"
              style={{ opacity: isDragging && draggingId !== widget.id ? 0.4 : 1 }}
            >
              {renderWidget(widget)}
            </div>
          ))}
        </Responsive>
      )}
    </div>
  );
};
