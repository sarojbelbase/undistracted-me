import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Responsive, useContainerWidth, getCompactor } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

import { WIDGET_REGISTRY } from "./index";
import { WIDGET_COMPONENTS } from "./components";
import { STORAGE_KEYS } from "../constants/storageKeys";
import { useWidgetInstancesStore } from "../store/useWidgetInstancesStore";
import { useSettingsStore } from "../store";
import { useUIStore } from "../store/useUIStore";
import { WidgetActionsContext } from "./WidgetActionsContext";
import { ErrorBoundary, WidgetErrorFallback } from "../components/ui/ErrorBoundary";

const LAYOUT_KEY = STORAGE_KEYS.WIDGET_LAYOUT;

// Consistent horizontal margin (container edge padding) across all breakpoints.
// Vertical padding per breakpoint is preserved in BP_SPECS for fine-tuning.
const WIDGETGRID_X_MARGIN = 12;

// Grid row height (px): matches the RGL `rowHeight`; a widget's `h` spans
// `h` rows plus `(h - 1)` inter-row margins.
const ROW_HEIGHT = 8.5;
// The canvas scroll container in App.jsx reserves a 64px (`pt-16`) top bar for
// the mode buttons, so the widget grid's visible area is the viewport minus this
// offset (plus the grid's own vertical padding).
const TOP_BAR_OFFSET = 64;

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
// containerPadding: [horizontal, vertical]: horizontal is the consistent
// WIDGETGRID_X_MARGIN; vertical stays per-breakpoint for layout tuning.
const RGL_PADDING = Object.fromEntries(
  BP_SPECS.map((s) => [s.name, [WIDGETGRID_X_MARGIN, s.padding]]),
);

const BP_NAMES = BP_SPECS.map((s) => s.name);

// Stable RGL config objects: hoisted so their identity doesn't change on every
// WidgetGrid render (RGL memoizes internally on these references). "vertical"
// compaction pulls widgets up to fill gaps (gravity); `scale: 1` is the required
// PositionStrategy field the absolute strategy defaults in practice.
const RESIZE_CONFIG = { enabled: false };
const DRAG_HANDLE = ".widget-drag-handle";
const GRAVITY_COMPACTOR = getCompactor("vertical");
const ABSOLUTE_POSITION_STRATEGY = { type: "absolute", scale: 1 };

// Structural equality across every breakpoint's layout items (i, x, y, w, h).
// Must compare ALL breakpoints: not just lg: because a drag at md/sm/xs/xxs
// only mutates that breakpoint's array; an lg-only compare would treat the
// change as "unchanged", discard it and the layout would revert on reload.
function layoutsEqual(a, b) {
  for (const bp of BP_NAMES) {
    const la = a[bp] || [];
    const lb = b[bp] || [];
    if (la.length !== lb.length) return false;
    for (let i = 0; i < la.length; i++) {
      const x = la[i];
      const y = lb[i];
      if (!y || x.i !== y.i || x.x !== y.x || x.y !== y.y || x.w !== y.w || x.h !== y.h) {
        return false;
      }
    }
  }
  return true;
}

function quantizeWidth(width) {
  const { cols, margin } =
    BP_SPECS.find((s) => width >= s.minW) ?? BP_SPECS.at(-1);
  const colW = Math.round((width - 2 * WIDGETGRID_X_MARGIN - (cols - 1) * margin) / cols);
  // Clamp: never exceed the actual container width: otherwise RGL
  // over-estimates available space and right-edge items eat into the
  // containerPadding, breaking the symmetrical 12px margin.
  const qw = colW * cols + (cols - 1) * margin + 2 * WIDGETGRID_X_MARGIN;
  return Math.min(qw, width);
}

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

// Memoized widget cell: isolates each widget subtree from grid re-renders.
// react-grid-layout fires onLayoutChange per drag pixel, re-rendering the whole
// grid. Without memo that re-rendered all 16 widgets' internals at 60Hz during
// a drag. The context value + onRemove are memoized per (id) so React.memo
// actually pays off: otherwise the fresh `{ id, duplicate }` object and inline
// arrows would defeat it and force every BaseWidget subtree to re-render.
const WidgetCell = React.memo(function WidgetCell({
  id,
  type,
  onRemoveInstance,
  duplicateInstance,
}) {
  const onRemove = useMemo(
    () => (onRemoveInstance ? () => onRemoveInstance(id) : undefined),
    [onRemoveInstance, id],
  );
  const contextValue = useMemo(
    () => ({ id, type, duplicate: () => duplicateInstance(id) }),
    [id, type, duplicateInstance],
  );

  const Component = WIDGET_COMPONENTS[type];

  if (!Component) return null;

  return (
    <WidgetActionsContext.Provider value={contextValue}>
      <Component id={id} onRemove={onRemove} />
    </WidgetActionsContext.Provider>
  );
});

/** Shown when there are no renderable widgets (all removed, or unknown types). */
const EmptyCanvas = () => (
  <div
    className="w-full h-full flex flex-col items-center justify-center gap-2.5 select-none"
    style={{ minHeight: 280, textAlign: "center" }}
  >
    <span style={{ fontSize: 40, lineHeight: 1 }} aria-hidden="true">🖼️</span>
    <p style={{ fontSize: 14, fontWeight: 700, color: "var(--w-ink-2)" }}>
      Your canvas is empty
    </p>
    <p style={{ fontSize: 12, color: "var(--w-ink-4)", maxWidth: 300, lineHeight: 1.5 }}>
      Add widgets from the <strong style={{ color: "var(--w-ink-3)" }}>Widgets</strong> button in the top-right corner.
    </p>
  </div>
);

export const WidgetGrid = React.memo(function WidgetGrid({
  instances,
  onRemoveInstance,
  arrangeMode = false,
  onExitArrangeMode,
}) {
  // No padding on this div: padding lives inside containerPadding on <Responsive> instead.
  // This makes offsetWidth === contentRect.width === window.innerWidth, so
  // measureWidth() and ResizeObserver both fire with the same value we seeded,
  // meaning setWidth() is called with an unchanged value and React skips all
  // post-mount re-renders. Without this, 2-3 forced re-renders caused the blink.
  //
  // debounceTimeout: when a window resize crosses a breakpoint, react-grid-layout
  // re-renders once per ResizeObserver firing *and* once more in its own
  // breakpoint-detection useEffect (new width + stale cols, then corrected cols).
  // During a fast resize that's a burst of transient layouts: widgets visibly
  // flash through wrong positions before settling (worst on frosted-glass cards
  // whose backdrop-filter re-rasterizes every frame). Debouncing the width update
  // coalesces the burst into a single width change → a single, imperceptible
  // relayout instead of a multi-frame glitch.
  const { width, containerRef } = useContainerWidth({
    initialWidth: globalThis.innerWidth ?? 1280,
    debounceTimeout: 120,
  });

  // Quantize the container width so column widths are always integer CSS pixels.
  // At fractional DPRs (e.g. 125% Windows scaling), a raw width like 1009.6px
  // gives col = 68.97px: GPU compositing then places text at sub-physical-pixel
  // positions causing persistent blur. Uses breakpoint-specific cols/margin/padding
  // so the snap is accurate at every viewport size, not just lg.
  const quantizedWidth = quantizeWidth(width);
  // Breakpoint is derived from the SAME width RGL receives (quantizedWidth), and
  // fed back as a controlled `breakpoint` + `key`. Without the key, RGL keeps
  // `cols` as internal state updated in a post-render effect, so a breakpoint
  // crossing renders once with stale cols (widgets flash to wrong/off-screen
  // positions) before the effect corrects it. Remounting on breakpoint change
  // makes RGL compute the correct cols + layout synchronously on mount → a single
  // clean swap instead of a multi-frame glitch.
  const currentBpSpec =
    BP_SPECS.find((s) => quantizedWidth >= s.minW) ?? BP_SPECS.at(-1);
  const currentBp = currentBpSpec.name;
  // Bound drag to the visible screen: react-grid-layout clamps drag `y` through
  // its default gridBounds constraint to `maxRows - h`. Without a finite
  // `maxRows` (default Infinity) a downward drag lands arbitrarily far below the
  // fold. Compute the number of rows that fit in the viewport minus the top-bar
  // offset and the grid's vertical padding, so free placement stays free but
  // widgets can never be dropped outside the canvas.
  const maxRows = Math.max(
    1,
    Math.floor(
      (globalThis.innerHeight - TOP_BAR_OFFSET - currentBpSpec.padding) /
        (ROW_HEIGHT + currentBpSpec.margin),
    ),
  );
  const [layouts, setLayouts] = useState(loadLayouts);
  const [draggingId, setDraggingId] = useState(null);

  // Widget-instance actions for the "⋯" menu (Duplicate).
  const duplicateInstance = useWidgetInstancesStore((s) => s.duplicateInstance);

  // Blend widgets into the background until hovered (Appearance → Widget Focus).
  const widgetDim = useSettingsStore((s) => s.widgetDim);

  // Settings → General "Reset layout": clears the saved layout back to defaults.
  const layoutResetRequest = useUIStore((s) => s.layoutResetRequest);
  useEffect(() => {
    if (!layoutResetRequest) return;
    // Drop the persisted layout so the next mount (and this render) falls back
    // to each widget's config.js default position/size.
    localStorage.removeItem(LAYOUT_KEY);
    setLayouts({});
  }, [layoutResetRequest]);

  // Build layout items for all breakpoints.
  // lg uses positions from each widget's config.js.
  // Other breakpoints use saved layouts (returning users) or config breakpoints (fresh install).
  const layoutItems = useMemo(() => {
    const savedLgMap = Object.fromEntries(
      (layouts.lg || []).map((l) => [l.i, l]),
    );
    const lgItems = (instances || []).flatMap(({ id, type }) => {
      const reg = REG_MAP[type];
      if (!reg) return []; // unknown type: skip to avoid ghost grid cells
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
        // Enforce config h as a minimum floor: prevents stale saved layouts
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
    // RGL 2.3.0 calls onLayoutChange only on meaningful changes (mount, drag
    // stop, resize stop, breakpoint/children change): never per drag pixel.
    // Persist the authoritative full layout here; the previous onDragStop write
    // fired before RGL committed the final layout, saving stale/empty positions
    // (drag positions were silently lost on reload).
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(allLayouts));
    setLayouts((prev) => {
      const next = { ...prev, ...allLayouts };
      // Fast structural compare across all breakpoints: avoids re-rendering
      // (and returning a new object) when nothing actually changed, but keeps
      // every breakpoint's real changes.
      if (layoutsEqual(prev, next)) return prev;
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

  // Only `enabled` varies with state: memoize the one non-constant config object.
  const dragConfig = useMemo(
    () => ({ enabled: arrangeMode, handle: DRAG_HANDLE }),
    [arrangeMode],
  );

  // Zero renderable widgets → show an empty-state hint instead of a blank page.
  const renderableCount = (instances || []).filter(
    ({ type }) => WIDGET_COMPONENTS[type],
  ).length;
  if (renderableCount === 0) {
    return (
      <div className="w-full h-full" ref={containerRef}>
        <EmptyCanvas />
      </div>
    );
  }

  // ── Mobile stack (< 480px, not in arrange mode) ────────────────────────────
  // react-grid-layout wraps every item in DraggableCore which registers a
  // non-passive touchstart listener unconditionally: even when isDraggable=false.
  // On phones, every widget fills the full width so every touch hits one of
  // these listeners, and the browser delays scroll while waiting for JS.
  // Below 480px (xxs breakpoint) we skip RGL entirely and render a plain
  // vertical stack so native touch-scroll works with zero friction.
  if (width < 480 && !arrangeMode) {
    const PAD = WIDGETGRID_X_MARGIN;
    const GAP = 6;
    const ROW_H = 8.5;
    // Sort by xxs y position so visual order matches what RGL would show.
    const savedXxsY = (id) => (layouts.xxs || []).find((l) => l.i === id)?.y;
    const sorted = [...(instances || [])].sort((a, b) => {
      const ay = savedXxsY(a.id) ?? REG_MAP[a.type]?.breakpoints?.xxs?.y ?? REG_MAP[a.type]?.y ?? 0;
      const by = savedXxsY(b.id) ?? REG_MAP[b.type]?.breakpoints?.xxs?.y ?? REG_MAP[b.type]?.y ?? 0;
      return ay - by;
    });
    return (
      <div className="w-full select-none" ref={containerRef} style={{ padding: PAD }}>
        <div style={{ display: "flex", flexDirection: "column", gap: GAP }}>
          {sorted.map(({ id, type }) => {
            const reg = REG_MAP[type];
            if (!WIDGET_COMPONENTS[type] || !reg) return null;
            const h = reg.breakpoints?.xxs?.h ?? reg.h;
            const height = h * ROW_H + (h - 1) * GAP;
            return (
              <div key={id} data-widget-type={type} className={widgetDim ? "widget-dim" : undefined} style={{ height }}>
                <ErrorBoundary fallback={(_error, reset) => <WidgetErrorFallback reset={reset} />}>
                  <WidgetCell
                    id={id}
                    type={type}
                    onRemoveInstance={onRemoveInstance}
                    duplicateInstance={duplicateInstance}
                  />
                </ErrorBoundary>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative select-none" ref={containerRef}>
      {/* Dot grid: visible while dragging or in arrange mode */}
      <div
        className="absolute inset-0 pointer-events-none drag-dot-overlay transition-opacity duration-200"
        style={{ opacity: showOverlay ? 0.5 : 0 }}
      />
      {/* Center the quantized grid so any underflow from integer column-width
           snapping is split evenly across both sides instead of all landing on the right. */}
      <div style={{ width: quantizedWidth, margin: "0 auto" }}>
        <Responsive
          key={currentBp}
          className="layout"
          layouts={layoutItems}
          width={quantizedWidth}
          breakpoint={currentBp}
          breakpoints={RGL_BREAKPOINTS}
          cols={RGL_COLS}
          rowHeight={ROW_HEIGHT}
          maxRows={maxRows}
          // react-grid-layout 2.3.0 moved the flat props into composable config
          // objects. The old `isDraggable` / `draggableHandle` / `useCSSTransforms`
          // props are silently ignored: which previously left drag enabled at all
          // times (widgets rearrangeable without entering arrange mode).
          dragConfig={dragConfig}
          resizeConfig={RESIZE_CONFIG}
          // Gravity: vertical compaction pulls widgets up to fill gaps, so the
          // grid stays tightly packed (no floating widgets, no overlaps). Dragging
          // reorders within the compacted flow.
          compactor={GRAVITY_COMPACTOR}
          positionStrategy={ABSOLUTE_POSITION_STRATEGY}
          margin={RGL_MARGIN}
          containerPadding={RGL_PADDING}
          onLayoutChange={handleLayoutChange}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
        >
          {(instances || []).map(({ id, type }) => {
            if (!WIDGET_COMPONENTS[type]) return null;
            return (
              <div
                key={id}
                data-widget-type={type}
                className={`group relative w-full h-full ${widgetDim ? "widget-dim" : ""}`}
                style={{
                  touchAction: arrangeMode ? "none" : "pan-y",
                }}
              >
                {/* Drag handle: visible only in arrange mode */}
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
                  <ErrorBoundary fallback={(_error, reset) => <WidgetErrorFallback reset={reset} />}>
                    <WidgetCell
                      id={id}
                      type={type}
                      onRemoveInstance={onRemoveInstance}
                      duplicateInstance={duplicateInstance}
                    />
                  </ErrorBoundary>
                </div>
              </div>
            );
          })}
        </Responsive>
      </div>
    </div>
  );
});
