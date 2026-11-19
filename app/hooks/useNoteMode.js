import { useState, useCallback } from 'react';

/**
 * Manages note-mode visibility. Mirrors useFocusMode minus the keyboard
 * shortcut — Note Mode is entered via the Launch Mode setting (`defaultView`
 * === 'note', affecting the next new tab) or the canvas Note button (affecting
 * the current tab), and exited via its back button / Escape.
 */
export function useNoteMode(defaultView) {
  const [showNoteMode, setShowNoteMode] = useState(() => defaultView === 'note');

  const openNoteMode = useCallback(() => setShowNoteMode(true), []);
  const closeNoteMode = useCallback(() => setShowNoteMode(false), []);

  return { showNoteMode, openNoteMode, closeNoteMode };
}
