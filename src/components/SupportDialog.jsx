/**
 * SupportDialog — dark "Help <app> keep growing" dialog (buymemomo.com model).
 *
 * Presentational only: it takes `open` / `onClose` and renders nothing when
 * closed. `SupportNudge` (same file) is the connected wrapper that reads the
 * support store and supplies the real app name + links, so the app just mounts
 * `<SupportNudge />` once and completion points call `triggerSupportNudge(...)`.
 *
 * Visual language: a warm, hand-crafted "thank-you card" — film-grain noise
 * texture, a warm espresso→amber gradient, a serif display title, and a glowing
 * gradient Momo call-to-action with a shine sweep on hover.
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
        {/* warm ambient glow + film grain */}
        <span className="sd-glow" aria-hidden="true" />
        <span className="sd-grain" aria-hidden="true" />

        <header className="sd-header">
          <span className="sd-badge" aria-hidden="true">
            <HeartIcon size={26} />
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
            <MomoIcon size={22} />
          </span>
          <span className="sd-cta-label">
            Support on Buy Me a Momo
            <span className="sd-cta-hint">It&rsquo;s the price of a snack</span>
          </span>
          <ArrowIcon />
        </a>

        {githubUrl && (
          <a
            className="sd-star"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="sd-star-icon" aria-hidden="true">
              <StarIcon />
            </span>
            <span className="sd-star-text">
              A star on GitHub also helps more people find {appName}, and it
              means a lot.
            </span>
          </a>
        )}

        <footer className="sd-footer">
          <p className="sd-thanks">
            Thank you for being here. <HeartIcon size={16} />
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

function ArrowIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="sd-cta-arrow"
    >
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </svg>
  );
}

function MomoIcon({ size = 22 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4C7.03 4 3 7.13 3 11c0 1.9.8 3.6 2.1 4.9.2.2.3.4.2.6l-.4 2.3c-.1.4.3.8.7.6l2.4-1.1c.2-.1.4-.1.6 0 1 .4 2.1.6 3.4.6 4.97 0 9-3.13 9-7S16.97 4 12 4z"
        fill="currentColor"
      />
      <path
        d="M7 6.6c-.3.9-.3 1.9 0 2.9M9.4 6.1c-.3.9-.3 1.9 0 2.9M11.8 6c-.3.9-.3 1.9 0 2.9M14.2 6c-.3.9-.3 1.9 0 2.9M16.6 6.1c-.3.9-.3 1.9 0 2.9"
        stroke="rgba(0,0,0,0.30)"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
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
  background:
    radial-gradient(120% 120% at 50% 0%, rgba(245, 166, 35, 0.10), transparent 55%),
    rgba(9, 6, 4, 0.66);
  backdrop-filter: blur(7px) saturate(1.1);
  -webkit-backdrop-filter: blur(7px) saturate(1.1);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI",
    Roboto, Helvetica, Arial, sans-serif;
}

.sd-card {
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 520px;
  box-sizing: border-box;
  padding: 30px 30px 24px;
  border-radius: 22px;
  background:
    linear-gradient(160deg, #2a1e14 0%, #1b130c 55%, #120c07 100%) padding-box,
    linear-gradient(150deg, rgba(245, 166, 35, 0.45), rgba(249, 115, 22, 0.12) 40%, rgba(245, 166, 35, 0.30)) border-box;
  border: 1px solid transparent;
  box-shadow:
    0 30px 70px rgba(0, 0, 0, 0.55),
    0 0 0 1px rgba(0, 0, 0, 0.4),
    0 12px 40px rgba(245, 166, 35, 0.10);
  color: #f6f1e8;
  animation: sd-pop 0.24s cubic-bezier(0.22, 1, 0.36, 1);
}

/* warm ambient light */
.sd-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(90% 60% at 50% -10%, rgba(245, 166, 35, 0.18), transparent 60%),
    radial-gradient(70% 50% at 100% 110%, rgba(249, 115, 22, 0.10), transparent 55%);
}

/* film-grain noise texture */
.sd-grain {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.055;
  mix-blend-mode: soft-light;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
}

@keyframes sd-pop {
  from { opacity: 0; transform: scale(0.96) translateY(8px); }
  to   { opacity: 1; transform: none; }
}

.sd-header {
  position: relative;
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 18px;
}

.sd-badge {
  flex: none;
  width: 54px;
  height: 54px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: linear-gradient(140deg, #f6b93b, #f26d21);
  color: #3b1f05;
  box-shadow:
    0 8px 20px rgba(242, 109, 33, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
  transform: rotate(-4deg);
}

.sd-title {
  margin: 0;
  font-family: "Fraunces", "Iowan Old Style", Georgia, "Times New Roman", serif;
  font-size: 26px;
  line-height: 1.14;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: #f8f2e6;
}

.sd-body {
  position: relative;
  margin: 0 0 22px;
  font-size: 15.5px;
  line-height: 1.55;
  font-weight: 500;
  color: rgba(243, 235, 222, 0.74);
}

/* ── Momo call-to-action ── */
.sd-cta {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  overflow: hidden;
  padding: 14px 20px;
  border-radius: 16px;
  background: linear-gradient(135deg, #f7b733 0%, #f2721f 100%);
  color: #2b1703;
  text-decoration: none;
  box-shadow:
    0 10px 28px rgba(242, 114, 31, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
}
.sd-cta:hover {
  transform: translateY(-2px);
  filter: brightness(1.04);
  box-shadow:
    0 16px 38px rgba(242, 114, 31, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
.sd-cta:active { transform: translateY(0) scale(0.99); }

.sd-cta-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.22);
  color: #2b1703;
}

.sd-cta-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  line-height: 1.2;
}
.sd-cta-hint {
  font-size: 12px;
  font-weight: 500;
  opacity: 0.7;
}

.sd-cta-arrow {
  flex: none;
  transition: transform 0.18s ease;
}
.sd-cta:hover .sd-cta-arrow { transform: translateX(3px); }

/* shine sweep */
.sd-cta::after {
  content: "";
  position: absolute;
  top: 0;
  left: -130%;
  width: 55%;
  height: 100%;
  background: linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  transform: skewX(-20deg);
  transition: left 0.65s ease;
  pointer-events: none;
}
.sd-cta:hover::after { left: 135%; }

/* ── GitHub star (secondary) ── */
.sd-star {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.4;
  color: rgba(243, 235, 222, 0.72);
  text-decoration: none;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.sd-star:hover {
  background: rgba(245, 166, 35, 0.08);
  border-color: rgba(245, 166, 35, 0.28);
  color: #f6b93b;
}
.sd-star-icon {
  flex: none;
  color: #f6b93b;
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.sd-star:hover .sd-star-icon { transform: scale(1.18) rotate(18deg); }
.sd-star-text { flex: 1; }

/* ── Footer ── */
.sd-footer {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sd-thanks {
  margin: 0;
  font-size: 13.5px;
  color: rgba(243, 235, 222, 0.5);
}
.sd-thanks svg { color: #f2721f; margin-left: 4px; vertical-align: middle; }

.sd-done {
  padding: 9px 22px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  color: #f6f1e8;
  font: inherit;
  font-size: 14.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.sd-done:hover { background: rgba(255, 255, 255, 0.09); border-color: rgba(255, 255, 255, 0.2); }

.sd-cta:focus-visible,
.sd-star:focus-visible,
.sd-done:focus-visible {
  outline: 2px solid #f6b93b;
  outline-offset: 3px;
}

@media (max-width: 480px) {
  .sd-card { padding: 24px 20px 20px; }
  .sd-title { font-size: 22px; }
  .sd-cta { width: 100%; box-sizing: border-box; }
}

@media (prefers-reduced-motion: reduce) {
  .sd-card { animation: none; }
  .sd-cta, .sd-star, .sd-done, .sd-cta-arrow, .sd-cta::after, .sd-star-icon { transition: none; }
  .sd-cta:hover::after { left: -130%; }
}
`;
