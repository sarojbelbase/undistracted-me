/**
 * useGoogleAccountStore — centralized Google OAuth state.
 *
 * Single source of truth for Google auth across ALL widgets and focus mode.
 * One connect/disconnect action covers Calendar, Contacts, Drive, and Tasks.
 *
 * Consumers:
 *  - AccountsDialog  (connect/disconnect UI)
 *  - FocusMode       (Tasks panel, Drive search)
 *  - IntegrationRow  (status badge)
 *  - useFocusTasks   (reacts to google_account_changed event)
 */
import { create } from 'zustand';
import {
  getGoogleAuthToken,
  getGoogleUserProfile,
  isGoogleAuthAvailable,
  signOutGoogle,
} from '../utilities/googleAuth';
import { disconnectCalendar } from '../utilities/googleCalendar';
import { disconnectContacts } from '../utilities/googleContacts';

/** Custom event dispatched on connect/disconnect so hooks can react without prop-drilling. */
export const GOOGLE_ACCOUNT_CHANGED = 'google_account_changed';

/** localStorage key to prevent auto-reconnect after explicit user sign-out. */
const USER_DISCONNECTED_KEY = 'google_user_disconnected';

export const useGoogleAccountStore = create((set, get) => ({
  connected: false,
  profile: null,   // { name, email, picture } | null
  connecting: false,
  disconnecting: false,
  error: null,
  initialized: false,

  /**
   * Silent init — checks for an existing valid token without showing OAuth UI.
   * Call once from App root on mount.
   */
  init: async () => {
    if (get().initialized) return;
    set({ initialized: true });
    if (!isGoogleAuthAvailable()) return;
    // Don't auto-reconnect if the user explicitly disconnected in this session.
    if (localStorage.getItem(USER_DISCONNECTED_KEY) === '1') return;
    try {
      const token = await getGoogleAuthToken(false);
      if (token) {
        const profile = await getGoogleUserProfile();
        set({ connected: true, profile });
      }
    } catch {
      set({ connected: false });
    }
  },

  /** Interactive connect — opens Google OAuth UI. */
  connect: async () => {
    if (!isGoogleAuthAvailable()) {
      set({ error: 'Google sign-in is not available in this environment.' });
      return;
    }
    // User is actively connecting — clear the disconnected flag so init() works again next reload.
    localStorage.removeItem(USER_DISCONNECTED_KEY);
    set({ connecting: true, error: null });
    try {
      await getGoogleAuthToken(true);
      const profile = await getGoogleUserProfile();
      set({ connected: true, profile, connecting: false });
      globalThis.dispatchEvent(
        new CustomEvent(GOOGLE_ACCOUNT_CHANGED, { detail: { connected: true, profile } }),
      );
    } catch (err) {
      set({ connecting: false, error: err.message || 'Sign-in failed. Try again.' });
    }
  },

  /** Disconnect — clears token + all Google service caches. */
  disconnect: async () => {
    // Persist user intent so init() skips auto-reconnect on next page load.
    localStorage.setItem(USER_DISCONNECTED_KEY, '1');
    // Update state immediately so UI responds — don't block on async token/cache cleanup.
    // (Mirroring the earlier approach: set state first, then clean up in the background.)
    set({ connected: false, profile: null, error: null, disconnecting: false });
    globalThis.dispatchEvent(
      new CustomEvent(GOOGLE_ACCOUNT_CHANGED, { detail: { connected: false, profile: null } }),
    );
    // Background cleanup — pass null like the earlier code to avoid fetching a token
    // right after clearAllCachedAuthTokens (which can cause chrome.identity to hang).
    try { await signOutGoogle(null); } catch { /* best-effort */ }
    disconnectCalendar().catch(() => { });
    disconnectContacts().catch(() => { });
  },

  clearError: () => set({ error: null }),
}));
