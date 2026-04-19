import { useState, useEffect, useCallback } from 'react';

/**
 * Manages widget arrange-mode state.
 * Pressing Escape while active exits arrange mode.
 */
export function useArrangeMode() {
  const [arrangeMode, setArrangeMode] = useState(false);

  useEffect(() => {
    if (!arrangeMode) return;
    const handler = (e) => { if (e.key === 'Escape') setArrangeMode(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [arrangeMode]);

  const toggleArrangeMode = useCallback(() => setArrangeMode(s => !s), []);

  return { arrangeMode, toggleArrangeMode };
}
