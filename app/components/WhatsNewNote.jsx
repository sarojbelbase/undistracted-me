/**
 * WhatsNewNote — small, one-time "What's new" toast shown after an update.
 *
 * Shown only to returning users (those who have already seen the quick tour),
 * so a fresh install sees the welcome overlay and not this note. Gated by
 * `useSettingsStore.whatsNewSeenVersion !== LATEST_VERSION`.
 */
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { XLg } from "react-bootstrap-icons";
import { useSettingsStore } from "../store/useSettingsStore";
import { LATEST_VERSION, CHANGELOG } from "../constants/whatsNew";

export function WhatsNewNote() {
  const whatsNewSeenVersion = useSettingsStore((s) => s.whatsNewSeenVersion);
  const markWhatsNewSeen = useSettingsStore((s) => s.markWhatsNewSeen);

  // Snapshot whether this is a returning user at mount. A fresh user who
  // dismisses the quick tour shouldn't then see this note pop in reactively.
  const [wasReturning] = useState(
    () => useSettingsStore.getState().quickTourSeenVersion != null,
  );
  const [visible, setVisible] = useState(false);

  const entry = CHANGELOG[0];
  const shouldShow = wasReturning && whatsNewSeenVersion !== LATEST_VERSION;

  const dismiss = useCallback(() => {
    markWhatsNewSeen(LATEST_VERSION);
    setVisible(false);
  }, [markWhatsNewSeen]);

  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [shouldShow]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, dismiss]);

  if (!shouldShow || !visible) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed z-9999"
      style={{ right: 16, bottom: 16, width: 320, maxWidth: "calc(100vw - 32px)" }}
    >
      <div
        style={{
          background: "var(--w-page-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 14,
          boxShadow: "var(--card-shadow)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--w-accent)",
            }}
          >
            What's new
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--w-ink-4)",
            }}
          >
            v{entry.version}
          </span>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            style={{
              marginLeft: "auto",
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "none",
              background: "transparent",
              color: "var(--w-ink-3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <XLg size={10} />
          </button>
        </div>

        <ul style={{ margin: 0, paddingLeft: 16, display: "flex", flexDirection: "column", gap: 4 }}>
          {entry.notes.map((note) => (
            <li
              key={note}
              style={{ fontSize: 12, lineHeight: 1.4, color: "var(--w-ink-2)" }}
            >
              {note}
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
