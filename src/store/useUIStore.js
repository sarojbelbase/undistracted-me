/**
 * useUIStore — lightweight global UI state for cross-widget dialogs.
 *
 * Allows any deeply-nested component (e.g. an IntegrationRow inside a
 * widget settings panel) to open the Accounts dialog without prop-drilling.
 */
import { create } from "zustand";

export const useUIStore = create((set) => ({
  // When non-null, App.jsx opens Settings and switches to this tab.
  settingsOpenAt: null,
  openAccountsDialog: () => set({ settingsOpenAt: 'accounts' }),
  clearSettingsOpenAt: () => set({ settingsOpenAt: null }),

  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  // Tracks whether Focus Mode is currently visible so useCommandPalette can
  // route Cmd+K to focus the inline search bar instead of opening the palette.
  focusModeActive: false,
  setFocusModeActive: (v) => set({ focusModeActive: v }),
}));
