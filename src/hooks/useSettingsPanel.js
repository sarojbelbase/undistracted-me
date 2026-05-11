import { useState, useEffect, useRef, useCallback } from 'react';

export function useSettingsPanel() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState('appearance');
  const panelRef = useRef(null);

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
    setShowSettings(s => {
      if (s) setSettingsInitialTab('appearance'); // reset on close
      return !s;
    });
  }, []);
  const closeSettings = useCallback(() => {
    setShowSettings(false);
    setSettingsInitialTab('appearance');
  }, []);
  const openAtTab = useCallback((tab) => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  }, []);

  return { showSettings, settingsInitialTab, panelRef, toggleSettings, closeSettings, openAtTab };
}
