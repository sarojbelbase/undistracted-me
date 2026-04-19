import './App.css';
import React, { useState, Suspense, lazy } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { FocusMode } from './components/FocusMode';
import { LookAway } from './components/LookAway';
import { useLookAwayScheduler, clearLookAwayDue } from './components/LookAway/hooks';
import { WidgetGrid } from './widgets/WidgetGrid';
import { BackgroundPicker } from './components/ui/BackgroundPicker';
import { CanvasBackground } from './components/ui/CanvasBackground';
import { ControlCluster } from './components/ui/ControlCluster';
import { FocusModeButton } from './components/ui/FocusModeButton';
import { useSettingsStore, useWidgetInstancesStore } from './store';
import { useAutoTheme } from './hooks/useAutoTheme';
import { useFocusMode } from './hooks/useFocusMode';
import { useSettingsPanel } from './hooks/useSettingsPanel';
import { useArrangeMode } from './hooks/useArrangeMode';
import { useCanvasBg } from './hooks/useCanvasBg';

// WidgetCatalog renders at App level (not inside ControlCluster) so keep its
// lazy import here; the preloader is passed down as a prop.
const catalogImport = () => import('./widgets/WidgetCatalog').then(m => ({ default: m.WidgetCatalog }));
const WidgetCatalog = lazy(catalogImport);
const preloadCatalog = () => catalogImport();

const App = () => {
  const [showCatalog, setShowCatalog] = useState(false);
  const [showLookAway, setShowLookAway] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);

  // ── Stores ──────────────────────────────────────────────────────────────────
  const {
    mode, accent, defaultView,
    lookAwayEnabled, lookAwayInterval, lookAwayNotify,
    canvasBg, setCanvasBg, cardStyle,
  } = useSettingsStore();
  const { instances, addInstance, removeInstance } = useWidgetInstancesStore();

  // ── Theme ───────────────────────────────────────────────────────────────────
  const effectiveMode = useAutoTheme(mode, accent, cardStyle);
  const isDark = effectiveMode === 'dark';

  // ── Feature hooks ────────────────────────────────────────────────────────────
  const { showFocusMode, focusModeEverShown, openFocusMode, closeFocusMode } = useFocusMode(defaultView);
  const { showSettings, panelRef, toggleSettings, closeSettings } = useSettingsPanel();
  const { arrangeMode, toggleArrangeMode } = useArrangeMode();
  const bg = useCanvasBg({ canvasBg, setCanvasBg, isDark, accent });

  useLookAwayScheduler({
    enabled: lookAwayEnabled,
    intervalMins: lookAwayInterval,
    notify: lookAwayNotify,
    onTrigger: () => setShowLookAway(true),
  });

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      id="fullscreen"
      className="relative h-screen w-screen overflow-auto"
      style={{ background: bg.pageBg }}
    >
      <CanvasBackground {...bg} isDark={isDark} />

      <FocusModeButton isDark={isDark} onClick={openFocusMode} />

      <ControlCluster
        ref={panelRef}
        isDark={isDark}
        arrangeMode={arrangeMode}
        toggleArrangeMode={toggleArrangeMode}
        showSettings={showSettings}
        toggleSettings={toggleSettings}
        closeSettings={closeSettings}
        onOpenCatalog={() => { setShowCatalog(true); closeSettings(); }}
        onPreloadCatalog={preloadCatalog}
        onPreviewLookAway={() => { setShowLookAway(true); closeSettings(); }}
        onOpenBgPicker={() => { setShowBgPicker(true); closeSettings(); }}
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

      <div className="w-full h-full pt-16">
        <WidgetGrid instances={instances} onRemoveInstance={removeInstance} arrangeMode={arrangeMode} />
      </div>

      {focusModeEverShown && (
        <div
          style={{ display: showFocusMode ? 'block' : 'none', pointerEvents: showFocusMode ? 'auto' : 'none' }}
          aria-hidden={!showFocusMode}
        >
          <FocusMode onExit={closeFocusMode} />
        </div>
      )}

      {showLookAway && (
        <LookAway
          onDismiss={() => { setShowLookAway(false); clearLookAwayDue(); }}
          duration={20}
          isDark={isDark}
        />
      )}

      {showBgPicker && (
        <BackgroundPicker
          scope="canvas"
          initialSource={bg.bgType}
          initialOrbId={bg.bgOrbId}
          initialCustomUrl={bg.bgType === 'custom' ? canvasBg?.url || null : null}
          initialPhotoUrl={bg.bgType === 'curated' ? canvasBg?.url || null : null}
          onClose={() => setShowBgPicker(false)}
          onApply={(type, opts = {}) => {
            setCanvasBg({ type, orbId: opts.orbId || bg.bgOrbId, url: opts.url ?? null, color: opts.color ?? null });
          }}
        />
      )}

      <Analytics />
    </div>
  );
};

export default App;
