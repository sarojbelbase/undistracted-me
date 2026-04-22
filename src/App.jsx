import './App.css';
import './styles/main.scss';
import React, { useState, Suspense, lazy, useEffect } from 'react';
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
import { useGoogleAccountStore } from './store/useGoogleAccountStore';
import { useUIStore } from './store/useUIStore';
import { useAutoTheme } from './hooks/useAutoTheme';
import { useLocation } from './hooks/useLocation';
import { useFocusMode } from './hooks/useFocusMode';
import { useSettingsPanel } from './hooks/useSettingsPanel';
import { useArrangeMode } from './hooks/useArrangeMode';
import { useCanvasBg } from './hooks/useCanvasBg';

// WidgetCatalog renders at App level (not inside ControlCluster) so keep its
// lazy import here; the preloader is passed down as a prop.
const catalogImport = () => import('./widgets/WidgetCatalog').then(m => ({ default: m.WidgetCatalog }));
const WidgetCatalog = lazy(catalogImport);
const preloadCatalog = () => catalogImport();

import { AccountsDialog } from './components/ui/AccountsDialog';

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
  const { accountsDialogOpen, closeAccountsDialog } = useUIStore();

  // ── Location (centralized coords, sun times, VPN detection) ─────────────────
  useLocation();

  // ── Google account — silent init (checks for existing token, no OAuth UI) ──
  useEffect(() => { useGoogleAccountStore.getState().init(); }, []);

  // ── Theme ───────────────────────────────────────────────────────────────────
  const effectiveMode = useAutoTheme(mode, accent, cardStyle);
  const isDark = effectiveMode === 'dark';

  // ── Feature hooks ────────────────────────────────────────────────────────────
  const { showFocusMode, focusModeEverShown, openFocusMode, closeFocusMode } = useFocusMode(defaultView);
  const { showSettings, panelRef, toggleSettings, closeSettings } = useSettingsPanel();
  const { arrangeMode, toggleArrangeMode, exitArrangeMode } = useArrangeMode();
  const bg = useCanvasBg({ canvasBg, setCanvasBg, isDark, accent });

  // Exit arrange mode when the user clicks anywhere outside a drag handle.
  // Skips the arrange-toggle button so its own onClick can handle the toggle.
  useEffect(() => {
    if (!arrangeMode) return;
    const onMouseDown = (e) => {
      if (e.target.closest('.widget-drag-handle') || e.target.closest('[data-arrange-toggle]')) return;
      exitArrangeMode();
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [arrangeMode, exitArrangeMode]);

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
      data-arrange={arrangeMode ? 'true' : undefined}
      className="relative h-screen w-screen overflow-y-auto overflow-x-hidden"
      style={{ background: bg.pageBg }}
    >
      <CanvasBackground {...bg} isDark={isDark} />

      {/* Arrange-mode page scrim — dark overlay signals exclusive edit state */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-[5]"
        style={{ background: 'rgba(0,0,0,0.32)', opacity: arrangeMode ? 1 : 0 }}
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
        <WidgetGrid instances={instances} onRemoveInstance={removeInstance} arrangeMode={arrangeMode} onExitArrangeMode={exitArrangeMode} />
      </div>

      {focusModeEverShown && (
        <div
          style={{ display: showFocusMode ? 'block' : 'none' }}
          inert={!showFocusMode}
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

      {typeof chrome === 'undefined' && <Analytics />}

      {/* Global AccountsDialog */}
      {accountsDialogOpen && (
        <AccountsDialog onClose={closeAccountsDialog} />
      )}

      {/* Bottom-right footer — app name + privacy link visible on homepage for Google OAuth review */}
      <div className="fixed bottom-3 right-4 z-40 flex items-center gap-2" style={{ color: isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.3)' }}>
        <span className="text-[11px] font-medium select-none">Undistracted Me</span>
        <span className="text-[9px]" style={{ opacity: 0.5 }}>·</span>
        <a
          href="https://undistractedme.sarojbelbase.com.np/pp-and-tos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] transition-opacity duration-200 hover:opacity-80"
          style={{
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          Privacy Policy &amp; Terms
        </a>
      </div>
    </div>
  );
};

export default App;
