/**
 * Support nudge store — dependency-injectable "Help keep growing" prompt.
 *
 * Any "completion" point (event / countdown / occasion saved, a LookAway break
 * finished) calls the imperative `triggerSupportNudge(reason)` helper. The store
 * applies a frequency policy — a cooldown window + a random gate — so the dialog
 * only appears "once in a while" instead of nagging on every single action.
 *
 * This is the injection seam: components never render or own the dialog, they
 * just report the completion. Whether (and when) the dialog actually opens is
 * decided here, in one place.
 */

import { create } from "zustand";

// ── Frequency policy (tune here) ─────────────────────────────────────────────
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // at most once every 3 days
const SHOW_PROBABILITY = 0.2; // 20% chance per qualifying trigger
const STORAGE_KEY = "support_last_shown";

function readLastShown() {
  try {
    return Number(localStorage.getItem(STORAGE_KEY)) || 0;
  } catch {
    return 0;
  }
}

export const useSupportStore = create((set, get) => ({
  /** Whether the support dialog is currently open. */
  open: false,
  /** The completion reason that opened it ('event' | 'countdown' | 'occasion' | 'lookaway'). */
  reason: null,

  show: (reason) => set({ open: true, reason: reason ?? null }),
  dismiss: () => set({ open: false }),

  /**
   * Fire-and-forget nudge entry point. Returns true when the dialog opened.
   */
  maybeNudge: (reason) => {
    if (get().open) return false;
    const now = Date.now();
    if (now - readLastShown() < COOLDOWN_MS) return false;
    if (Math.random() >= SHOW_PROBABILITY) return false;
    try {
      localStorage.setItem(STORAGE_KEY, String(now));
    } catch {
      /* storage unavailable */
    }
    set({ open: true, reason: reason ?? null });
    return true;
  },
}));

/**
 * Imperative, dependency-injectable trigger. Import this anywhere a completion
 * happens and call it with the reason:
 *
 *   import { triggerSupportNudge } from "../store/useSupportStore";
 *   triggerSupportNudge("event");
 */
export const triggerSupportNudge = (reason) =>
  useSupportStore.getState().maybeNudge(reason);

// Debug hook — exposes the store so QA can open the support dialog
// deterministically from the console (bypasses the random gate + cooldown):
//   window.__support.open()
if (typeof window !== "undefined" && import.meta.env.DEV) {
  window.__support = {
    open: () => useSupportStore.getState().show("console"),
    close: () => useSupportStore.getState().dismiss(),
    reset: () => localStorage.removeItem("support_last_shown"),
  };
}
