/**
 * useUIStore — lightweight global UI state for cross-widget dialogs.
 *
 * Allows any deeply-nested component (e.g. an IntegrationRow inside a
 * widget settings panel) to open the Accounts dialog without prop-drilling.
 */
import { create } from 'zustand';

export const useUIStore = create((set) => ({
  accountsDialogOpen: false,
  openAccountsDialog: () => set({ accountsDialogOpen: true }),
  closeAccountsDialog: () => set({ accountsDialogOpen: false }),
}));
