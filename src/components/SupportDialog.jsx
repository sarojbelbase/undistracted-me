/**
 * SupportDialog — dark "Help <app> keep growing" dialog (buymemomo.com model).
 *
 * Presentational only: it takes `open` / `onClose` and renders nothing when
 * closed. `SupportNudge` (same file) is the connected wrapper that reads the
 * support store and supplies the real app name + links, so the app just mounts
 * `<SupportNudge />` once and completion points call `triggerSupportNudge(...)`.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSupportStore } from "../store/useSupportStore";

const MOMO_URL = "https://buymemomo.com/sarojbelbase";
const GITHUB_URL = "https://github.com/sarojbelbase/undistracted-me";

export function SupportDialog({
  open = true,
  onClose = () => {},
  appName = "Undistracted Me",
  momoUrl = MOMO_URL,
  githubUrl = GITHUB_URL,
}) {
  const doneRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    doneRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sd-backdrop" onClick={onClose}>
      <style>{css}</style>
      <section
        className="sd-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sd-header">
          <span className="sd-badge" aria-hidden="true">
            <HeartIcon size={30} />
          </span>
          <h2 id="sd-title" className="sd-title">
            Help {appName} keep growing
          </h2>
        </header>

        <p className="sd-body">
          {appName} stays free and local, with no ads or usage tracking. If it
          helps you, Buy Me a Momo is the only way to help fund its development.
        </p>

        <a
          className="sd-cta"
          href={momoUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="sd-cta-icon" aria-hidden="true">
            🥟
          </span>
          Support on Buy Me a Momo
        </a>

        {githubUrl && (
          <a
            className="sd-star"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <StarIcon />A star on GitHub also helps more people find {appName},
            and it means a lot.
          </a>
        )}

        <footer className="sd-footer">
          <p className="sd-thanks">
            Thank you for being here. <HeartIcon size={20} />
          </p>
          <button
            ref={doneRef}
            type="button"
            className="sd-done"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

/**
 * Connected wrapper — mounts the dialog and drives it from the support store.
 * Mount this once at the app root (e.g. in App.jsx).
 */
export function SupportNudge() {
  const open = useSupportStore((s) => s.open);
  const dismiss = useSupportStore((s) => s.dismiss);
  return (
    <SupportDialog
      open={open}
      onClose={dismiss}
      appName="Undistracted Me"
      momoUrl={MOMO_URL}
      githubUrl={GITHUB_URL}
    />
  );
}

function HeartIcon({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style={{ verticalAlign: "middle" }}
    >
      <path d="M12 21.2c-.3 0-.6-.1-.8-.3C6.4 17 3 13.8 3 9.9 3 7.2 5.1 5 7.8 5c1.6 0 3.2.8 4.2 2.1C13 5.8 14.6 5 16.2 5 18.9 5 21 7.2 21 9.9c0 3.9-3.4 7.1-8.2 11-.2.2-.5.3-.8.3z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3.2z" />
    </svg>
  );
}

const css = `
.sd-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(4px);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
    Roboto, Helvetica, Arial, sans-serif;
}

.sd-card {
  width: 100%;
  max-width: 520px;
  box-sizing: border-box;
  padding: 28px 28px 22px;
  border-radius: 20px;
  background: #1e1f22;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
  color: #f2f2f4;
  animation: sd-pop 0.18s ease-out;
}

@keyframes sd-pop {
  from { opacity: 0; transform: scale(0.97) translateY(6px); }
  to   { opacity: 1; transform: none; }
}

.sd-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.sd-badge {
  flex: none;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #0f1012;
  color: #fff;
}

.sd-title {
  margin: 0;
  font-size: 24px;
  line-height: 1.2;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.sd-body {
  margin: 0 0 20px;
  font-size: 15.5px;
  line-height: 1.5;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.88);
}

.sd-cta {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 12px 26px 12px 20px;
  border-radius: 999px;
  background: #1a73e8;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.15s ease, transform 0.15s ease;
}
.sd-cta:hover { background: #2b82f5; }
.sd-cta:active { transform: scale(0.98); }
.sd-cta-icon { font-size: 20px; line-height: 1; }

.sd-star {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 18px;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.4;
  color: rgba(255, 255, 255, 0.85);
  text-decoration: none;
}
.sd-star:hover { color: #fff; text-decoration: underline; }
.sd-star svg { flex: none; }

.sd-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 26px;
}

.sd-thanks {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}
.sd-thanks svg { color: #fff; margin-left: 4px; }

.sd-done {
  padding: 8px 22px;
  border: 0;
  border-radius: 10px;
  background: #e9e9ec;
  color: #1c1c1e;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
.sd-done:hover { background: #fff; }

.sd-cta:focus-visible,
.sd-star:focus-visible,
.sd-done:focus-visible {
  outline: 2px solid #8ab4f8;
  outline-offset: 3px;
}

@media (max-width: 480px) {
  .sd-card { padding: 22px 20px 18px; }
  .sd-title { font-size: 20px; }
  .sd-cta { width: 100%; justify-content: center; box-sizing: border-box; }
}

@media (prefers-reduced-motion: reduce) {
  .sd-card { animation: none; }
  .sd-cta { transition: none; }
}
`;
