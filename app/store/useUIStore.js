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
  /** Open Settings at a given tab (defaults to 'general'). */
  openSettingsDialog: (tab = 'general') => set({ settingsOpenAt: tab }),
  clearSettingsOpenAt: () => set({ settingsOpenAt: null }),

  // ── Command intents (App.jsx consumes these via useEffect) ────────────────
  // Counter fields are bumped on request; App.jsx watches the count and reacts.
  catalogOpenRequest: 0,
  requestOpenCatalog: () => set((s) => ({ catalogOpenRequest: s.catalogOpenRequest + 1 })),

  arrangeToggleRequest: 0,
  requestArrangeToggle: () => set((s) => ({ arrangeToggleRequest: s.arrangeToggleRequest + 1 })),

  focusModeRequest: 0,
  requestFocusMode: () => set((s) => ({ focusModeRequest: s.focusModeRequest + 1 })),

  commandPaletteOpen: false,
  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),

  // Tracks whether Focus Mode is currently visible so useCommandPalette can
  // route Cmd+K to focus the inline search bar instead of opening the palette.
  focusModeActive: false,
  setFocusModeActive: (v) => set({ focusModeActive: v }),
}));
