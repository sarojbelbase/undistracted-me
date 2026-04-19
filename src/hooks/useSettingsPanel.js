import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Manages the settings panel open/closed state.
 * Closes on outside click and Escape key.
 * Attach the returned `panelRef` to the container element that wraps both
 * the trigger button and the settings panel so clicks inside never dismiss it.
 */
export function useSettingsPanel() {
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (e.type === 'keydown' && e.key === 'Escape') { setShowSettings(false); return; }
      if (panelRef.current && !panelRef.current.contains(e.target)) {
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

  const toggleSettings = useCallback(() => setShowSettings(s => !s), []);
  const closeSettings = useCallback(() => setShowSettings(false), []);

  return { showSettings, panelRef, toggleSettings, closeSettings };
}
