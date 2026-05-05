import { useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';

// Platform detection — evaluated once at module load, never changes at runtime.
const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const cmdKey = isMac ? '⌘K' : 'Ctrl+K';

/**
 * Manages command palette visibility + the Cmd+K / Ctrl+K keyboard shortcut.
 *
 * Routing:
 *   - Focus Mode active  → dispatches `um:focus_search_bar` to focus the inline
 *                          search pill instead of opening this overlay.
 *   - Dashboard active   → toggles `commandPaletteOpen` in useUIStore.
 *
 * Always calls e.preventDefault() to suppress the browser's own Cmd+K behaviour.
 */
export function useCommandPalette() {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);

  useEffect(() => {
    const handleKey = (e) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k')) return;
      e.preventDefault();

      const state = useUIStore.getState();

      // In Focus Mode — route to the inline search bar.
      if (state.focusModeActive) {
        globalThis.dispatchEvent(new CustomEvent('um:focus_search_bar'));
        return;
      }

      if (state.commandPaletteOpen) state.closeCommandPalette();
      else state.openCommandPalette();
    };

    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, []);

  return { commandPaletteOpen, closeCommandPalette };
}
