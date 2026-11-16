/**
 * ReviewPrompt — one-time "rate us" dialog shown after 10 focus sessions.
 * Links to the correct store for the user's browser. No analytics.
 */
import { createPortal } from "react-dom";
import { XLg, StarFill } from "react-bootstrap-icons";
import { useReviewPromptStore } from "./reviewPromptStore";
import { CHROME_STORE_URL, FIREFOX_ADDONS_URL } from "../../constants/urls";

const isFirefox =
  typeof navigator !== "undefined" && /Firefox\//i.test(navigator.userAgent);
const storeUrl = isFirefox ? FIREFOX_ADDONS_URL : CHROME_STORE_URL;
const storeLabel = isFirefox ? "Firefox Add-ons" : "Chrome Web Store";

export function ReviewPrompt() {
  const open = useReviewPromptStore((s) => s.open);
  const dismiss = useReviewPromptStore((s) => s.dismiss);
  const close = useReviewPromptStore((s) => s.close);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(12px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Rate Undistracted Me"
        style={{
          width: 400,
          maxWidth: "100%",
          background: "var(--w-page-bg)",
          border: "1px solid var(--card-border)",
          borderRadius: 16,
          boxShadow: "var(--card-shadow)",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "color-mix(in srgb, var(--w-accent) 14%, transparent)",
              color: "var(--w-accent)",
              flexShrink: 0,
            }}
          >
            <StarFill size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--w-ink-1)" }}>
              Enjoying Undistracted Me?
            </div>
            <div style={{ fontSize: 11, color: "var(--w-ink-4)", marginTop: 2 }}>
              You've completed 10 focus sessions.
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              border: "1px solid var(--card-border)",
              background: "var(--panel-bg)",
              color: "var(--w-ink-3)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <XLg size={10} />
          </button>
        </div>

        <p
          style={{
            fontSize: 12.5,
            lineHeight: 1.55,
            color: "var(--w-ink-2)",
            margin: 0,
          }}
        >
          A quick rating on the {storeLabel} helps others find a calmer new tab.
          It only takes a few seconds — and it means a lot.
        </p>

        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={dismiss}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "9px 14px",
              borderRadius: 10,
              border: "none",
              background: "var(--w-accent)",
              color: "var(--w-accent-fg)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            Rate on {storeLabel}
          </a>
          <button
            type="button"
            onClick={dismiss}
            style={{
              padding: "9px 14px",
              borderRadius: 10,
              border: "1px solid var(--card-border)",
              background: "var(--panel-bg)",
              color: "var(--w-ink-2)",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
