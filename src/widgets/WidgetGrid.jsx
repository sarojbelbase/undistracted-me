import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
  NotesWidget,
  BookmarksWidget,
  QuickAccessWidget,
  PomodoroWidget,
  SpotifyWidget,
  FactsWidget,
  StockWidget,
  BirthdaysWidget,
} from './index';

const LAYOUT_KEY = 'widget_grid_layouts';

// O(1) lookup: type → registry entry
const REG_MAP = Object.fromEntries(WIDGET_REGISTRY.map(w => [w.type, w]));

const loadLayouts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
  } catch { /* ignore */ }
  return {};
};

const renderWidget = (id, type, onRemove) => {
  switch (type) {
    case WIDGET_TYPES.CLOCK: return <ClockWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.DATE_TODAY: return <DateTodayWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.DAY_PROGRESS: return <DayProgressWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.EVENTS: return <EventsWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.WEATHER: return <WeatherWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.CALENDAR: return <CalendarWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.COUNTDOWN: return <CountdownWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.NOTES: return <NotesWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.BOOKMARKS: return <BookmarksWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.QUICK_ACCESS: return <QuickAccessWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.POMODORO: return <PomodoroWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.SPOTIFY: return <SpotifyWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.FACTS: return <FactsWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.STOCK: return <StockWidget id={id} onRemove={onRemove} />;
    case WIDGET_TYPES.BIRTHDAYS: return <BirthdaysWidget id={id} onRemove={onRemove} />;
    default: return null;
  }
};

export const WidgetGrid = ({ instances, onRemoveInstance }) => {
  // No padding on this div — padding lives inside containerPadding on <Responsive> instead.
  // This makes offsetWidth === contentRect.width === window.innerWidth, so
  // measureWidth() and ResizeObserver both fire with the same value we seeded,
  // meaning setWidth() is called with an unchanged value and React skips all
  // post-mount re-renders. Without this, 2-3 forced re-renders caused the blink.
  const { width, containerRef } = useContainerWidth({
    initialWidth: typeof window !== 'undefined' ? window.innerWidth : 1280,
  });
  const [layouts, setLayouts] = useState(loadLayouts);
  const [draggingId, setDraggingId] = useState(null);

  // Build layout items from current instances
  const layoutItems = useMemo(() => {
    const savedMap = Object.fromEntries((layouts.lg || []).map(l => [l.i, l]));
    return (instances || []).map(({ id, type }) => {
      if (savedMap[id]) return savedMap[id];
      const reg = REG_MAP[type];
      return reg
        ? { i: id, x: reg.x, y: Infinity, w: reg.w, h: reg.h }
        : { i: id, x: 0, y: Infinity, w: 3, h: 3 };
    });
  }, [instances, layouts]);

  const handleLayoutChange = useCallback((_current, allLayouts) => {
    setLayouts(prev => {
      const next = { ...prev, ...allLayouts };
      // Return same reference if lg positions are unchanged — prevents mount re-render
      // (react-grid-layout calls onLayoutChange once on mount even with no changes)
      if (JSON.stringify(prev.lg) === JSON.stringify(next.lg)) return prev;
      localStorage.setItem(LAYOUT_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const handleDragStart = useCallback((_layout, oldItem) => {
    setDraggingId(oldItem.i);
  }, []);

  const handleDragStop = useCallback(() => {
    setDraggingId(null);
  }, []);

  // Safety net: if onDragStop doesn't fire (mouse released outside viewport), clear state
  useEffect(() => {
    const clear = () => setDraggingId(null);
    document.addEventListener('mouseup', clear);
    return () => document.removeEventListener('mouseup', clear);
  }, []);

  const isDragging = draggingId !== null;

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {/* Dot grid — only visible while dragging */}
      <div
        className="absolute inset-0 pointer-events-none drag-dot-overlay transition-opacity duration-200"
        style={{ opacity: isDragging ? 0.5 : 0 }}
      />
      <Responsive
        className="layout"
        layouts={{ lg: layoutItems }}
        width={width}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={75}
        isDraggable={true}
        draggableHandle=".widget-drag-handle"
        isResizable={false}
        margin={[16, 16]}
        containerPadding={[16, 16]}
        useCSSTransforms={false}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      >
        {(instances || []).map(({ id, type }) => (
          <div
            key={id}
            className="group relative w-full h-full transition-opacity duration-200"
            style={{ opacity: isDragging && draggingId !== id ? 0.4 : 1 }}
          >
            {/* Drag handle — single notch pill with 3 dots in one row */}
            <div
              className="widget-drag-handle absolute top-0 left-1/2 -translate-x-1/2 z-30
                  flex items-center gap-[3.5px] px-2.5 py-1.5 rounded-b-xl
                  cursor-grab active:cursor-grabbing select-none
                  opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)', borderTop: 'none' }}
              aria-label="Drag to move"
            >
              {[0, 1, 2, 3].map(i => (
                <span key={i} className="block w-[3px] h-[3px] rounded-xl" style={{ backgroundColor: 'var(--w-ink-3)' }} />
              ))}
            </div>
            {/* Stop mousedown from bubbling to the rgl drag listener — only the handle above should initiate drag */}
            <div className="h-full w-full" onMouseDown={e => e.stopPropagation()}>
              {renderWidget(id, type, onRemoveInstance ? () => onRemoveInstance(id) : undefined)}
            </div>
          </div>
        ))}
      </Responsive>
    </div>
  );
};
