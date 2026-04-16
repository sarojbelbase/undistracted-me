import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Responsive, useContainerWidth } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { WIDGET_REGISTRY } from './index';
import { STORAGE_KEYS } from '../constants/storageKeys';

const LAYOUT_KEY = STORAGE_KEYS.WIDGET_LAYOUT;

// O(1) lookup: type → registry entry (includes Component)
const REG_MAP = Object.fromEntries(WIDGET_REGISTRY.map(w => [w.type, w]));

const loadLayouts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
  } catch { /* ignore */ }
  return {};
};

// Self-registering render — new widgets just need a Component in their config.
const renderWidget = (id, type, onRemove) => {
  const reg = REG_MAP[type];
  if (!reg?.Component) return null;
  return <reg.Component id={id} onRemove={onRemove} />;
};

export const WidgetGrid = React.memo(function WidgetGrid({ instances, onRemoveInstance, arrangeMode = false }) {
  // No padding on this div — padding lives inside containerPadding on <Responsive> instead.
  // This makes offsetWidth === contentRect.width === window.innerWidth, so
  // measureWidth() and ResizeObserver both fire with the same value we seeded,
  // meaning setWidth() is called with an unchanged value and React skips all
  // post-mount re-renders. Without this, 2-3 forced re-renders caused the blink.
  const { width, containerRef } = useContainerWidth({
    initialWidth: globalThis.innerWidth ?? 1280,
  });
  const [layouts, setLayouts] = useState(loadLayouts);
  const [draggingId, setDraggingId] = useState(null);

  // Build layout items for all breakpoints.
  // lg uses positions from each widget's config.js.
  // Other breakpoints use saved layouts (returning users) or BREAKPOINT_DEFAULTS (fresh install).
  const layoutItems = useMemo(() => {
    const savedLgMap = Object.fromEntries((layouts.lg || []).map(l => [l.i, l]));
    const lgItems = (instances || []).flatMap(({ id, type }) => {
      const reg = REG_MAP[type];
      if (!reg) return [];  // unknown type — skip to avoid ghost grid cells
      if (savedLgMap[id]) return [savedLgMap[id]];
      return [{ i: id, x: reg.x, y: reg.y ?? Infinity, w: reg.w, h: reg.h }];
    });

    const bpItems = bp => {
      if (layouts[bp]?.length) return layouts[bp];
      return (instances || []).flatMap(({ id, type }) => {
        const reg = REG_MAP[type];
        if (!reg) return [];
        const pos = reg.breakpoints?.[bp];
        return [{ i: id, x: pos?.x ?? 0, y: pos?.y ?? Infinity, w: pos?.w ?? reg.w, h: pos?.h ?? reg.h }];
      });
    };

    return { lg: lgItems, md: bpItems('md'), sm: bpItems('sm'), xs: bpItems('xs'), xxs: bpItems('xxs') };
  }, [instances, layouts]);

  const handleLayoutChange = useCallback((_current, allLayouts) => {
    setLayouts(prev => {
      const next = { ...prev, ...allLayouts };
      // Fast structural compare — avoids serialising the full array to strings.
      // Only check the fields that affect persistence (i, x, y, w, h).
      const prevLg = prev.lg || [];
      const nextLg = next.lg || [];
      if (prevLg.length === nextLg.length) {
        const unchanged = nextLg.every((item, idx) => {
          const old = prevLg[idx];
          return old && old.i === item.i && old.x === item.x && old.y === item.y && old.w === item.w && old.h === item.h;
        });
        if (unchanged) return prev;
      }
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
  const showOverlay = isDragging || arrangeMode;

  return (
    <div className="w-full h-full relative" ref={containerRef}>
      {/* Dot grid — visible while dragging or in arrange mode */}
      <div
        className="absolute inset-0 pointer-events-none drag-dot-overlay transition-opacity duration-200"
        style={{ opacity: showOverlay ? 0.5 : 0 }}
      />
      <Responsive
        className="layout"
        layouts={layoutItems}
        width={width}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={75}
        isDraggable={arrangeMode}
        draggableHandle=".widget-drag-handle"
        isResizable={false}
        compactType={null}
        preventCollision={false}
        margin={{ lg: [14, 14], md: [16, 16], sm: [10, 10], xs: [8, 8], xxs: [6, 6] }}
        containerPadding={{ lg: [14, 14], md: [16, 16], sm: [10, 10], xs: [8, 8], xxs: [6, 6] }}
        useCSSTransforms={false}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      >
        {(instances || []).map(({ id, type }) => {
          const widget = renderWidget(id, type, onRemoveInstance ? () => onRemoveInstance(id) : undefined);
          if (!widget) return null;
          return (
            <div
              key={id}
              className="group relative w-full h-full transition-opacity duration-200"
              style={{ opacity: isDragging && draggingId !== id ? 0.4 : 1 }}
            >
              {/* Drag handle — visible only in arrange mode */}
              <div
                className={`widget-drag-handle absolute top-0 left-1/2 -translate-x-1/2 z-30
                  flex items-center gap-[3.5px] px-2.5 py-1.5 rounded-b-xl
                  cursor-grab active:cursor-grabbing select-none
                  transition-opacity duration-200 ${arrangeMode ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', border: '1px solid var(--card-border)', borderTop: 'none', boxShadow: 'var(--card-shadow)' }}
                aria-label="Drag to move"
              >
                {[0, 1, 2, 3].map(i => (
                  <span key={i} className="block w-0.75 h-0.75 rounded-xl" style={{ backgroundColor: 'var(--w-ink-3)' }} />
                ))}
              </div>
              {/* Intercept mousedown so widget content receives clicks without triggering rgl drag */}
              <div className="h-full w-full" onMouseDown={e => e.stopPropagation()} aria-hidden="true">
                {widget}
              </div>
            </div>
          );
        })}
      </Responsive>
    </div>
  );
});
