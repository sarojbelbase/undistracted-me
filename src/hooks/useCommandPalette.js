import { useEffect } from 'react';
import { useUIStore } from '../store/useUIStore';

// Platform detection — evaluated once at module load, never changes at runtime.
const isMac = /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent);
export const cmdKey = isMac ? '⌘K' : 'Ctrl+K';

/**
 * Manages command palette visibility state + the Cmd+K / Ctrl+K keyboard shortcut.
 *
 * - Always calls e.preventDefault() to suppress the browser's own Cmd+K behaviour.
 * - No INPUT/TEXTAREA guard — the palette should open from anywhere (including
 *   when the user is typing in a widget input).
 * - Uses useUIStore.getState() inside the handler to avoid stale closure issues.
 */
export function useCommandPalette() {
  const commandPaletteOpen = useUIStore((s) => s.commandPaletteOpen);
  const closeCommandPalette = useUIStore((s) => s.closeCommandPalette);

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const { commandPaletteOpen, openCommandPalette, closeCommandPalette } =
          useUIStore.getState();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
    };

    globalThis.addEventListener('keydown', handleKey);
    return () => globalThis.removeEventListener('keydown', handleKey);
  }, []);

  return { commandPaletteOpen, closeCommandPalette };
}
