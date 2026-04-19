import { useState, useEffect, useCallback } from 'react';

// Platform detection — evaluated once at module load, never changes at runtime.
const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const focusShortcut = isMac ? '⌥⇧F' : 'Alt+Shift+F';

/**
 * Manages focus mode visibility state + the Alt+Shift+F keyboard shortcut.
 * Returns stable callbacks so callers can safely pass them as event handlers.
 */
export function useFocusMode(defaultView) {
  const [showFocusMode, setShowFocusMode] = useState(() => defaultView === 'focus');
  const [focusModeEverShown, setFocusModeEverShown] = useState(() => defaultView === 'focus');

  useEffect(() => {
    const handleKey = (e) => {
      if (!e.altKey || !e.shiftKey || e.key.toLowerCase() !== 'f') return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setShowFocusMode(v => {
        if (!v) setFocusModeEverShown(true);
        return !v;
      });
    };
    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, []);

  const openFocusMode = useCallback(() => {
    setFocusModeEverShown(true);
    setShowFocusMode(true);
  }, []);

  const closeFocusMode = useCallback(() => setShowFocusMode(false), []);

  return { showFocusMode, focusModeEverShown, openFocusMode, closeFocusMode };
}
