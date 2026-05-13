import "./App.css";
import "./styles/main.scss";
import React, { useState, Suspense, lazy, useEffect } from "react";
import {
  useLookAwayScheduler,
  clearLookAwayDue,
  snoozeLookAway,
} from "./components/LookAway/hooks";
import { WidgetGrid } from "./widgets/WidgetGrid";

import { CanvasBackground } from "./components/ui/CanvasBackground";
import { ControlCluster } from "./components/ui/ControlCluster";
import { FocusModeButton } from "./components/ui/FocusModeButton";
import { useSettingsStore, useWidgetInstancesStore } from "./store";
import { STORE_KEY } from "./store/useSettingsStore";
import { seedWidgetInstancesIfEmpty } from "./store/seedWidgetInstances";
import { useGoogleAccountStore } from "./store/useGoogleAccountStore";
import { useUIStore } from "./store/useUIStore";
import { useShallow } from "zustand/react/shallow";
import { useAutoTheme } from "./hooks/useAutoTheme";
import { useLocation } from "./hooks/useLocation";
import { useFocusMode } from "./hooks/useFocusMode";
import { useSettingsPanel } from "./hooks/useSettingsPanel";
import { useArrangeMode } from "./hooks/useArrangeMode";
import { useCanvasBg } from "./hooks/useCanvasBg";
import { useCommandPalette } from "./hooks/useCommandPalette";
import { getCachedPhotoSync, getBgSource } from "./utilities/unsplash";
import bgImage from "./assets/img/bg.webp";

// ── On-demand lazy components ────────────────────────────────────────────────

const _focusModeChunk = (() => {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
    if (stored?.state?.defaultView === 'focus') {
      return import("./components/FocusMode");
    }
  } catch { /* ignore */ }
  return null;
})();

const FocusMode = lazy(() =>
  (_focusModeChunk || import("./components/FocusMode"))
    .then((m) => ({ default: m.FocusMode })),
);

// Analytics is only used on the web demo — lazy-import so the module is never
// parsed in extension builds where `chrome` is defined and it never renders.
const Analytics = lazy(() =>
  import("@vercel/analytics/react").then((m) => ({ default: m.Analytics })),
);

const LookAway = lazy(() =>
  import("./components/LookAway").then((m) => ({ default: m.LookAway })),
);

const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((m) => ({ default: m.CommandPalette })),
);

// WidgetCatalog renders at App level (not inside ControlCluster) so keep its
// lazy import here; the preloader is passed down as a prop.
const catalogImport = () =>
  import("./widgets/WidgetCatalog").then((m) => ({ default: m.WidgetCatalog }));
const WidgetCatalog = lazy(catalogImport);
const preloadCatalog = () => catalogImport();

// ── Dev-only breakpoint indicator ───────────────────────────────────────────

const BP_CONFIG = [
  { name: "xxs", maxWidth: 480, color: "#a78bfa" },
  { name: "xs", maxWidth: 768, color: "#34d399" },
  { name: "sm", maxWidth: 996, color: "#60a5fa" },
  { name: "md", maxWidth: 1200, color: "#fbbf24" },
  { name: "lg", maxWidth: Infinity, color: "#f87171" },
];

const useBreakpoint = () => {
  const getW = () =>
    window.innerWidth || document.documentElement.clientWidth || 0;
  const fromW = (w) => ({
    ...(BP_CONFIG.find((bp) => w < bp.maxWidth) ?? BP_CONFIG.at(-1)),
    width: w,
  });
  const [bp, setBp] = React.useState(() => fromW(getW()));
  React.useEffect(() => {
    const update = () => setBp(fromW(getW()));
    globalThis.addEventListener("resize", update);
    update(); // sync after mount in case initial width was 0
    return () => globalThis.removeEventListener("resize", update);
  }, []);
  return bp;
};

const BreakpointBadge = () => {
  const bp = useBreakpoint();
  return (
    <div
      className="fixed bottom-3 left-4 z-9999 flex items-center gap-1.5 px-2.5 py-1 rounded-full select-none font-mono text-[11px] font-semibold"
      style={{
        backgroundColor: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(8px)",
        color: bp.color,
        border: `1px solid ${bp.color}40`,
        letterSpacing: "0.06em",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          backgroundColor: bp.color,
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      {bp.name}
      <span style={{ color: "rgba(255,255,255,0.35)", fontWeight: 400 }}>
        {bp.width}px
      </span>
    </div>
  );
};

// ── FocusMode Suspense fallback ────────────────────────────────────────────────
// Synchronously reads localStorage to match the actual background the user configured,
// eliminating the dark flash when the FocusMode chunk is still loading.
const CUSTOM_BG_KEY = 'fm_custom_bg_url';
function FMFallback() {
  const src = getBgSource();
  const base = "fixed inset-0 z-50 bg-cover bg-center";
  if (src === 'orb') {
    return <div className={base} style={{ backgroundColor: '#060608' }} />;
  }
  if (src === 'curated') {
    const photo = getCachedPhotoSync();
    return <div className={base} style={{ backgroundColor: photo?.color || '#18191b' }} />;
  }
  if (src === 'custom') {
    let url = null;
    try { url = localStorage.getItem(CUSTOM_BG_KEY); } catch { /* ignore */ }
    if (url) return <div className={base} style={{ backgroundImage: `url(${url})` }} />;
  }
  // 'default' — show bg.webp (exact match to FocusMode's default state)
  return <div className={base} style={{ backgroundImage: `url(${bgImage})` }} />;
}

const App = () => {
  const [showCatalog, setShowCatalog] = useState(false);
  const [showLookAway, setShowLookAway] = useState(false);

  // ── Stores ──────────────────────────────────────────────────────────────────
  const { mode, accent, defaultView, lookAwayEnabled, lookAwayInterval, cardStyle } =
    useSettingsStore(useShallow(s => ({
      mode: s.mode,
      accent: s.accent,
      defaultView: s.defaultView,
      lookAwayEnabled: s.lookAwayEnabled,
      lookAwayInterval: s.lookAwayInterval,
      cardStyle: s.cardStyle,
    })));
  const canvasBg = useSettingsStore(s => s.canvasBg);
  const setCanvasBg = useSettingsStore(s => s.setCanvasBg);
  const instances = useWidgetInstancesStore(s => s.instances);
  const addInstance = useWidgetInstancesStore(s => s.addInstance);
  const removeInstance = useWidgetInstancesStore(s => s.removeInstance);
  const { settingsOpenAt, clearSettingsOpenAt } = useUIStore();

  // ── Location (centralized coords, sun times, VPN detection) ─────────────────
  useLocation();

  // ── Google account — silent init (checks for existing token, no OAuth UI) ──
  useEffect(() => {
    useGoogleAccountStore.getState().init();
  }, []);

  // ── Seed default widgets on fresh install / after reset ──────────────────────
  useEffect(() => { seedWidgetInstancesIfEmpty(); }, []);

  // ── Theme ───────────────────────────────────────────────────────────────────
  const effectiveMode = useAutoTheme(mode, accent, cardStyle);
  const isDark = effectiveMode === "dark";

  // ── Feature hooks ────────────────────────────────────────────────────────────
  const { showFocusMode, focusModeEverShown, openFocusMode, closeFocusMode } =
    useFocusMode(defaultView);
  const { showSettings, settingsInitialTab, panelRef, toggleSettings, closeSettings, openAtTab } =
    useSettingsPanel();

  // Open Settings at the accounts tab when any widget calls openAccountsDialog().
  useEffect(() => {
    if (settingsOpenAt) {
      openAtTab(settingsOpenAt);
      clearSettingsOpenAt();
    }
  }, [settingsOpenAt, openAtTab, clearSettingsOpenAt]);
  const { arrangeMode, toggleArrangeMode, exitArrangeMode } = useArrangeMode();
  const bg = useCanvasBg({ canvasBg, setCanvasBg, isDark, accent });
  const { commandPaletteOpen, closeCommandPalette } = useCommandPalette();

  // Sync Focus Mode active state so useCommandPalette can route Cmd+K correctly.
  useEffect(() => {
    useUIStore.getState().setFocusModeActive(showFocusMode);
  }, [showFocusMode]);

  // Exit arrange mode when the user clicks anywhere outside a drag handle.
  // Skips the arrange-toggle button so its own onClick can handle the toggle.
  useEffect(() => {
    if (!arrangeMode) return;
    const onPointerDown = (e) => {
      if (
        e.target.closest(".widget-drag-handle") ||
        e.target.closest("[data-arrange-toggle]")
      )
        return;
      exitArrangeMode();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [arrangeMode, exitArrangeMode]);

  useLookAwayScheduler({
    enabled: lookAwayEnabled,
    intervalMins: lookAwayInterval,
    notify: true,
    onTrigger: () => setShowLookAway(true),
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      id="fullscreen"
      data-arrange={arrangeMode ? "true" : undefined}
      className="fixed inset-0 overflow-hidden"
      style={{ background: bg.pageBg }}
    >
      <CanvasBackground {...bg} isDark={isDark} />

      {/* Arrange-mode page scrim — dims the canvas background, sits below widgets */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-2"
        style={{ background: "rgba(0,0,0,0.28)", opacity: arrangeMode ? 1 : 0 }}
      />

      <FocusModeButton isDark={isDark} onClick={openFocusMode} />

      <ControlCluster
        ref={panelRef}
        isDark={isDark}
        arrangeMode={arrangeMode}
        toggleArrangeMode={toggleArrangeMode}
        showSettings={showSettings}
        toggleSettings={toggleSettings}
        closeSettings={closeSettings}
        settingsInitialTab={settingsInitialTab}
        onOpenCatalog={() => {
          setShowCatalog(true);
          closeSettings();
        }}
        onPreloadCatalog={preloadCatalog}
        onPreviewLookAway={() => {
          setShowLookAway(true);
          closeSettings();
        }}
      />

      {showCatalog && (
        <Suspense fallback={null}>
          <WidgetCatalog
            instances={instances}
            onAddInstance={addInstance}
            onRemoveInstance={removeInstance}
            onClose={() => setShowCatalog(false)}
          />
        </Suspense>
      )}

      <div className="relative z-3 w-full h-full overflow-x-hidden pt-16" style={{ overflowY: 'scroll', WebkitOverflowScrolling: 'touch' }}>
        <WidgetGrid
          instances={instances}
          onRemoveInstance={removeInstance}
          arrangeMode={arrangeMode}
          onExitArrangeMode={exitArrangeMode}
        />
      </div>

      {focusModeEverShown && (
        <div
          style={{ display: showFocusMode ? "block" : "none" }}
          inert={!showFocusMode}
        >
          <Suspense fallback={showFocusMode ? <FMFallback /> : null}>
            <FocusMode onExit={closeFocusMode} />
          </Suspense>
        </div>
      )}

      {showLookAway && (
        <Suspense fallback={null}>
          <LookAway
            onDismiss={() => {
              setShowLookAway(false);
              clearLookAwayDue();
            }}
            onSnooze={(mins) => {
              setShowLookAway(false);
              snoozeLookAway(mins);
            }}
            duration={20}
            isDark={isDark}
          />
        </Suspense>
      )}

      {typeof chrome === "undefined" && (
        <Suspense fallback={null}>
          <Analytics />
        </Suspense>
      )}

      {/* Command Palette — Cmd+K / Ctrl+K */}
      {commandPaletteOpen && !showFocusMode && (
        <Suspense fallback={null}>
          <CommandPalette
            onClose={closeCommandPalette}
          />
        </Suspense>
      )}

      {/* Dev-only breakpoint badge — bottom-left */}
      {import.meta.env.DEV && <BreakpointBadge />}

      {/* Bottom-right footer — app name + privacy link visible on homepage for Google OAuth review */}
      <div
        className="fixed bottom-3 right-4 z-40 flex items-center gap-2"
        style={{ color: isDark ? "rgba(255,255,255,0.28)" : "rgba(0,0,0,0.3)" }}
      >
        <span className="text-[11px] font-medium select-none">
          Undistracted Me
        </span>
        <span className="text-[9px]" style={{ opacity: 0.5 }}>
          ·
        </span>
        <a
          href="https://undistractedme.sarojbelbase.com.np/pp-and-tos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] transition-opacity duration-200 hover:opacity-80"
          style={{
            color: "inherit",
            textDecoration: "none",
          }}
        >
          Privacy Policy &amp; Terms
        </a>
      </div>
    </div>
  );
};

export default App;
