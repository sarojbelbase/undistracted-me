import { useState, useEffect, useRef, useCallback } from 'react';

/** Single source of truth for the default settings tab. */
export const DEFAULT_SETTINGS_TAB = 'general';

export function useSettingsPanel() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState(DEFAULT_SETTINGS_TAB);
  const panelRef = useRef(null);
  // Mirror of showSettings so toggleSettings can read the current value without
  // a stale closure (its dep list is []) and without nesting a setState inside a
  // setState updater (which React double-invokes in StrictMode).
  const showSettingsRef = useRef(false);
  // Keep the ref in sync via an effect — writing refs during render is unsafe
  // under concurrent rendering (a discarded render could observe a stale ref).
  useEffect(() => {
    showSettingsRef.current = showSettings;
  }, [showSettings]);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') { setShowSettings(false); return; }
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        // Don't close if the click is inside a portal modal (e.g. a confirmation dialog).
        if (e.target.closest('dialog[aria-modal="true"]')) return;
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', handler);
    };
  }, [showSettings]);

  const toggleSettings = useCallback(() => {
    // Reset the initial tab when closing (read the current value from the ref —
    // setState-in-setState is an impure updater).
    if (showSettingsRef.current) setSettingsInitialTab(DEFAULT_SETTINGS_TAB);
    setShowSettings((s) => !s);
  }, []);
  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setSettingsInitialTab(DEFAULT_SETTINGS_TAB);
  }, []);
  const openAtTab = useCallback((tab) => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  }, []);

  return { showSettings, settingsInitialTab, panelRef, toggleSettings, closeSettings, openAtTab };
}
