import React, { useState, useCallback, useEffect, useMemo, Suspense } from "react";
import { Responsive, useContainerWidth } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import { WIDGET_REGISTRY } from "./index";
import { STORAGE_KEYS } from "../constants/storageKeys";

const LAYOUT_KEY = STORAGE_KEYS.WIDGET_LAYOUT;

const BP_SPECS = [
  { name: "lg", minW: 1200, cols: 48, margin: 14, padding: 14 },
  { name: "md", minW: 996, cols: 40, margin: 16, padding: 16 },
  { name: "sm", minW: 768, cols: 24, margin: 10, padding: 10 },
  { name: "xs", minW: 480, cols: 16, margin: 8, padding: 8 },
  { name: "xxs", minW: 0, cols: 8, margin: 6, padding: 6 },
];

const RGL_BREAKPOINTS = Object.fromEntries(
  BP_SPECS.map((s) => [s.name, s.minW]),
);
const RGL_COLS = Object.fromEntries(BP_SPECS.map((s) => [s.name, s.cols]));
const RGL_MARGIN = Object.fromEntries(
  BP_SPECS.map((s) => [s.name, [s.margin, s.margin]]),
);
const RGL_PADDING = Object.fromEntries(
  BP_SPECS.map((s) => [s.name, [s.padding, s.padding]]),
);

function quantizeWidth(width) {
  const { cols, margin, padding } =
    BP_SPECS.find((s) => width >= s.minW) ?? BP_SPECS[BP_SPECS.length - 1];
  // Use Math.floor so the quantized grid never exceeds the container width.
  // Math.round can push the grid past the viewport (e.g. 1440→1454 at lg),
  // which breaks visual symmetry between left and right margins when the
  // container clips the overflow.
  const colW = Math.floor((width - 2 * padding - (cols - 1) * margin) / cols);
  return colW * cols + (cols - 1) * margin + 2 * padding;
}

// Exported so ControlCluster can align its right edge with the grid.
export { quantizeWidth, BP_SPECS };

// O(1) lookup: type → registry entry (includes Component)
const REG_MAP = Object.fromEntries(WIDGET_REGISTRY.map((w) => [w.type, w]));

const loadLayouts = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || "null");
    if (saved && typeof saved === "object" && !Array.isArray(saved))
      return saved;
  } catch {
    /* ignore */
  }
  return {};
};

// Self-registering render — new widgets just need a Component in their config.
const renderWidget = (id, type, onRemove) => {
  const reg = REG_MAP[type];
  if (!reg?.Component) return null;
  return <reg.Component id={id} onRemove={onRemove} />;
};

export const WidgetGrid = React.memo(function WidgetGrid({
  instances,
  onRemoveInstance,
  arrangeMode = false,
  onExitArrangeMode,
}) {
  // No padding on this div — padding lives inside containerPadding on <Responsive> instead.
  // This makes offsetWidth === contentRect.width === window.innerWidth, so
  // measureWidth() and ResizeObserver both fire with the same value we seeded,
  // meaning setWidth() is called with an unchanged value and React skips all
  // post-mount re-renders. Without this, 2-3 forced re-renders caused the blink.
  const { width, containerRef } = useContainerWidth({
    initialWidth: globalThis.innerWidth ?? 1280,
  });

  // Quantize the container width so column widths are always integer CSS pixels.
  // At fractional DPRs (e.g. 125% Windows scaling), a raw width like 1009.6px
  // gives col = 68.97px — GPU compositing then places text at sub-physical-pixel
  // positions causing persistent blur. Uses breakpoint-specific cols/margin/padding
  // so the snap is accurate at every viewport size, not just lg.
  const quantizedWidth = quantizeWidth(width);
  const [layouts, setLayouts] = useState(loadLayouts);
  const [draggingId, setDraggingId] = useState(null);

  // Build layout items for all breakpoints.
  // lg uses positions from each widget's config.js.
  // Other breakpoints use saved layouts (returning users) or config breakpoints (fresh install).
  const layoutItems = useMemo(() => {
    const savedLgMap = Object.fromEntries(
      (layouts.lg || []).map((l) => [l.i, l]),
    );
    const lgItems = (instances || []).flatMap(({ id, type }) => {
      const reg = REG_MAP[type];
      if (!reg) return []; // unknown type — skip to avoid ghost grid cells
      if (savedLgMap[id]) return [savedLgMap[id]];
      return [{ i: id, x: reg.x, y: reg.y ?? Infinity, w: reg.w, h: reg.h }];
    });

    const bpItems = (bp) => {
      const configFloor = Object.fromEntries(
        (instances || []).flatMap(({ id, type }) => {
          const reg = REG_MAP[type];
          if (!reg) return [];
          const pos = reg.breakpoints?.[bp];
          return [[id, pos?.h ?? reg.h]];
        }),
      );

      if (layouts[bp]?.length) {
        // Enforce config h as a minimum floor — prevents stale saved layouts
        // from making widgets shorter than their content requires.
        return layouts[bp].map((item) => {
          const minH = configFloor[item.i];
          return minH != null && item.h < minH ? { ...item, h: minH } : item;
        });
      }
      return (instances || []).flatMap(({ id, type }) => {
        const reg = REG_MAP[type];
        if (!reg) return [];
        const pos = reg.breakpoints?.[bp];
        return [
          {
            i: id,
            x: pos?.x ?? 0,
            y: pos?.y ?? Infinity,
            w: pos?.w ?? reg.w,
            h: pos?.h ?? reg.h,
          },
        ];
      });
    };

    return {
      lg: lgItems,
      md: bpItems("md"),
      sm: bpItems("sm"),
      xs: bpItems("xs"),
      xxs: bpItems("xxs"),
    };
  }, [instances, layouts]);

  const handleLayoutChange = useCallback((current, allLayouts) => {
    setLayouts((prev) => {
      const next = { ...prev, ...allLayouts };
      // Fast structural compare — avoids serialising the full array to strings.
      // Only check the fields that affect persistence (i, x, y, w, h).
      const prevLg = prev.lg || [];
      const nextLg = next.lg || [];
      if (prevLg.length === nextLg.length) {
        const unchanged = nextLg.every((item, idx) => {
          const old = prevLg[idx];
          return (
            old &&
            old.i === item.i &&
            old.x === item.x &&
            old.y === item.y &&
            old.w === item.w &&
            old.h === item.h
          );
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
    document.addEventListener("mouseup", clear);
    return () => document.removeEventListener("mouseup", clear);
  }, []);

  const isDragging = draggingId !== null;
  const showOverlay = isDragging || arrangeMode;

  // ── Mobile stack (< 480px, not in arrange mode) ────────────────────────────
  // react-grid-layout wraps every item in DraggableCore which registers a
  // non-passive touchstart listener unconditionally — even when isDraggable=false.
  // On phones, every widget fills the full width so every touch hits one of
  // these listeners, and the browser delays scroll while waiting for JS.
  // Below 480px (xxs breakpoint) we skip RGL entirely and render a plain
  // vertical stack so native touch-scroll works with zero friction.
  if (width < 480 && !arrangeMode) {
    const PAD = 6;
    const GAP = 6;
    const ROW_H = 8.5;
    // Sort by xxs y position so visual order matches what RGL would show
    const sorted = [...(instances || [])].sort((a, b) => {
      const ay = REG_MAP[a.type]?.breakpoints?.xxs?.y ?? REG_MAP[a.type]?.y ?? 0;
      const by = REG_MAP[b.type]?.breakpoints?.xxs?.y ?? REG_MAP[b.type]?.y ?? 0;
      return ay - by;
    });
    return (
      <div className="w-full select-none" ref={containerRef} style={{ padding: PAD }}>
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          {sorted.map(({ id, type }) => {
            const reg = REG_MAP[type];
            const widget = renderWidget(id, type, onRemoveInstance ? () => onRemoveInstance(id) : undefined);
            if (!widget || !reg) return null;
            const h = reg.breakpoints?.xxs?.h ?? reg.h;
            const height = h * ROW_H + (h - 1) * GAP;
            return (
              <div key={id} data-widget-type={type} style={{ height }}>
                <Suspense fallback={null}>{widget}</Suspense>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative select-none mx-auto"
      ref={containerRef}
      style={{ width: quantizedWidth, maxWidth: "100%" }}
    >
      {/* Dot grid — visible while dragging or in arrange mode */}
      <div
        className="absolute inset-0 pointer-events-none drag-dot-overlay transition-opacity duration-200"
        style={{ opacity: showOverlay ? 0.5 : 0 }}
      />
      <Responsive
        className="layout"
        layouts={layoutItems}
        width={quantizedWidth}
        breakpoints={RGL_BREAKPOINTS}
        cols={RGL_COLS}
        rowHeight={8.5}
        isDraggable={arrangeMode}
        draggableHandle=".widget-drag-handle"
        isResizable={false}
        compactType="vertical"
        preventCollision={false}
        margin={RGL_MARGIN}
        containerPadding={RGL_PADDING}
        useCSSTransforms={false}
        onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      >
        {(instances || []).map(({ id, type }) => {
          const widget = renderWidget(
            id,
            type,
            onRemoveInstance ? () => onRemoveInstance(id) : undefined,
          );
          if (!widget) return null;
          return (
            <div
              key={id}
              data-widget-type={type}
              className="group relative w-full h-full transition-opacity duration-200"
              style={{
                opacity: 1,
                touchAction: arrangeMode ? "none" : "pan-y",
              }}
            >
              {/* Drag handle — visible only in arrange mode */}
              <div
                className={`widget-drag-handle absolute top-0 left-1/2 -translate-x-1/2 z-30
                  flex items-center gap-[3.5px] px-2.5 py-1.5 rounded-b-xl
                  cursor-grab active:cursor-grabbing select-none
                  transition-opacity duration-200 ${arrangeMode ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                style={{
                  backgroundColor: "var(--card-bg)",
                  backdropFilter: "var(--card-blur)",
                  border: "1px solid var(--card-border)",
                  borderTop: "none",
                  boxShadow: "var(--card-shadow)",
                }}
                aria-label="Drag to move"
              >
                {[0, 1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="block w-0.75 h-0.75 rounded-xl"
                    style={{ backgroundColor: "var(--w-ink-3)" }}
                  />
                ))}
              </div>
              {/* Intercept mousedown so widget content receives clicks without triggering rgl drag.
                   pointer-events:none in arrange mode prevents options/menus from opening. */}
              <div
                role="none"
                className="h-full w-full"
                style={{ pointerEvents: arrangeMode ? "none" : undefined }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <Suspense fallback={null}>{widget}</Suspense>
              </div>
            </div>
          );
        })}
      </Responsive>
    </div>
  );
});
