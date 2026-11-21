/**
 * Review-prompt store: one-time, permanently dismissible "rate us" nudge
 * that appears once the user has completed 10 focus sessions.
 *
 * - Counter + dismiss flag are persisted to localStorage (`review_prompt`),
 *   never sent anywhere (no analytics).
 * - The counter is seeded from existing `pomodoro_history` focus sessions on
 *   first run so users who already crossed the threshold are credited.
 */
import { create } from "zustand";
import { HISTORY_STORAGE_KEY, SESSION_TYPE } from "../../widgets/pomodoro/constants";

const STORAGE_KEY = "review_prompt";
export const FOCUS_SESSIONS_THRESHOLD = 10;

function countFocusSessionsInHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((s) => s?.type === SESSION_TYPE.FOCUS).length
      : 0;
  } catch {
    return 0;
  }
}

function readPersisted() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      focusSessionCount:
        typeof parsed?.focusSessionCount === "number"
          ? parsed.focusSessionCount
          : null,
      dismissed: !!parsed?.dismissed,
    };
  } catch {
    return null;
  }
}

function persist({ focusSessionCount, dismissed }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ focusSessionCount, dismissed }),
    );
  } catch {
    /* storage unavailable */
  }
}

export const useReviewPromptStore = create((set, get) => {
  const persisted = readPersisted();
  return {
    focusSessionCount:
      persisted?.focusSessionCount ?? countFocusSessionsInHistory(),
    dismissed: persisted?.dismissed ?? false,
    open: false,

    /** Call once after every completed focus session. */
    recordFocusSession: () => {
      if (get().dismissed) return;
      const count = get().focusSessionCount + 1;
      set({ focusSessionCount: count });
      persist({ focusSessionCount: count, dismissed: false });
      if (count >= FOCUS_SESSIONS_THRESHOLD) set({ open: true });
    },

    /** Check (and show) on app mount for users already past the threshold. */
    maybeShowOnMount: () => {
      if (get().dismissed || get().open) return;
      const count = Math.max(
        get().focusSessionCount,
        countFocusSessionsInHistory(),
      );
      if (count >= FOCUS_SESSIONS_THRESHOLD) set({ open: true });
    },

    /** Permanently dismiss (never show again). */
    dismiss: () => {
      set({ open: false, dismissed: true });
      persist({ focusSessionCount: get().focusSessionCount, dismissed: true });
    },

    /** Close without permanently dismissing (e.g. backdrop click). */
    close: () => set({ open: false }),
  };
});
