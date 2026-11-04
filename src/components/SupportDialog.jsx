/**
 * SupportDialog — "Help <app> keep growing" support nudge (riso print style).
 *
 * Presentational only: it takes `open` / `onClose` and renders nothing when
 * closed. `SupportNudge` (same file) is the connected wrapper that reads the
 * support store and supplies the real app name + links, so the app just mounts
 * `<SupportNudge />` once and completion points call `triggerSupportNudge(...)`.
 *
 * Visual language: a warm two-ink riso print — chestnut and marigold on butter
 * paper, a pleated momo mark on a gold circle, halftone dot corner, film-grain
 * texture, and a bold "Buy Me a Momo" call-to-action. Kept compact (square-ish,
 * not tall) and fully responsive from desktop down to narrow phone screens.
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
  closeLabel = `Continue to ${appName}`,
  momoUrl = MOMO_URL,
  githubUrl = GITHUB_URL,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
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
        <i className="sd-deco sd-deco-a" aria-hidden="true" />
        <i className="sd-deco sd-deco-b" aria-hidden="true" />

        <header className="sd-header">
          <span className="sd-badge" aria-hidden="true">
            <MomoMark />
          </span>
          <h2 id="sd-title" className="sd-title">
            Help {appName} keep growing
          </h2>
        </header>

        <p className="sd-body">
          {appName} is free and local, with no ads or usage tracking. If it
          helps you, Buy Me a Momo is the only way to help fund its development,
          and even the price of a snack counts.
        </p>
        <p className="sd-body sd-note">
          For the first 3 months, I&rsquo;m testing this support model. If it
          can&rsquo;t cover hosting and server costs, I&rsquo;ll have to switch
          to a paid model to keep {appName} running.
        </p>

        <a
          className="sd-cta"
          href={momoUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="sd-cta-row">
            <span className="sd-cta-label">Support on Buy Me a Momo</span>
            <ExternalIcon />
          </span>
          <span className="sd-cta-hint">External link, opens in a new tab</span>
        </a>

        {githubUrl && (
          <a
            className="sd-star"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <StarIcon />
            <span>
              A star on GitHub also helps more people find {appName}, and it
              means a lot.
              <span className="sd-sr"> (External link, opens in a new tab)</span>
            </span>
            <ExternalIcon />
          </a>
        )}

        <footer className="sd-footer">
          <p className="sd-thanks">
            Thank you for staying and using {appName}. <HeartIcon />
          </p>
          <button
            ref={closeRef}
            type="button"
            className="sd-close"
            onClick={onClose}
          >
            {closeLabel}
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

/* A pleated, half-moon momo drawn in one line weight. */
function MomoMark() {
  return (
    <svg
      viewBox="0 0 48 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        className="sd-momo-body"
        d="M3 31C3 12 13 8 24 8s21 4 21 23c-6 3-36 3-42 0z"
      />
      <path d="M24 8v13M16.5 10.5l2.5 12M31.5 10.5L29 22.5M10 15l5 9M38 15l-5 9" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      className="sd-star-ic"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      strokeWidth="1.7"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3.2l2.7 5.5 6.1.9-4.4 4.3 1 6-5.4-2.9-5.4 2.9 1-6-4.4-4.3 6.1-.9L12 3.2z" />
    </svg>
  );
}

/* Marks links that leave the app. Always paired with text, never alone. */
function ExternalIcon() {
  return (
    <svg
      className="sd-ext"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 21.2c-.3 0-.6-.1-.8-.3C6.4 17 3 13.8 3 9.9 3 7.2 5.1 5 7.8 5c1.6 0 3.2.8 4.2 2.1C13 5.8 14.6 5 16.2 5 18.9 5 21 7.2 21 9.9c0 3.9-3.4 7.1-8.2 11-.2.2-.5.3-.8.3z" />
    </svg>
  );
}

const css = `
.sd-backdrop {
  --g: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  --paper: #f8efd8;
  --ink: #3c2415;
  --ink-soft: #6a4e3c;
  --gold: #f2b134;
  --gold-deep: #c98a14;
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  padding: 16px;
  overflow: auto;
  background: rgba(38, 24, 14, 0.62);
  backdrop-filter: blur(4px);
  -webkit-font-smoothing: antialiased;
}

.sd-card {
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  width: 100%;
  max-width: 520px;
  margin: auto;
  padding: 28px 36px 22px;
  overflow: hidden;
  border-radius: 16px;
  background: var(--paper);
  color: var(--ink);
  font-family: "Bricolage Grotesque", system-ui, sans-serif;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.12), 0 24px 50px rgba(30, 15, 5, 0.4);
  animation: sd-in 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}

/* halftone dot corner (top-right) */
.sd-deco-a {
  display: block;
  position: absolute;
  top: 0;
  right: 0;
  width: 240px;
  height: 200px;
  pointer-events: none;
  z-index: -1;
  background: radial-gradient(circle, #e9bd62 1.6px, transparent 2.1px) 0 0 / 9px 9px;
  -webkit-mask-image: radial-gradient(circle at 100% 0, #000, transparent 65%);
          mask-image: radial-gradient(circle at 100% 0, #000, transparent 65%);
  mix-blend-mode: multiply;
  opacity: 0.5;
}

/* film-grain noise */
.sd-deco-b {
  display: block;
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background: var(--g);
  opacity: 0.18;
  mix-blend-mode: multiply;
}

.sd-header,
.sd-body,
.sd-cta,
.sd-star,
.sd-footer {
  position: relative;
}
.sd-title,
.sd-body,
.sd-thanks {
  margin: 0;
}

.sd-badge {
  --momo-fill: var(--paper);
  position: relative;
  width: 64px;
  height: 54px;
  margin: 0 0 18px 8px;
}
.sd-badge::before {
  content: "";
  position: absolute;
  left: -14px;
  top: -10px;
  width: 62px;
  height: 62px;
  border-radius: 50%;
  background: var(--gold);
  mix-blend-mode: multiply;
  z-index: -1;
}
.sd-badge svg {
  display: block;
  width: 100%;
  height: 100%;
}

.sd-title {
  font-size: 32px;
  line-height: 1.02;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.sd-body {
  margin-top: 12px;
  max-width: 44ch;
  font-size: 15.5px;
  line-height: 1.6;
  font-weight: 500;
}

.sd-note {
  margin-top: 10px;
  padding-left: 14px;
  border-left: 3px solid var(--gold);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-soft);
}

/* ── Momo call-to-action ── */
.sd-cta {
  display: flex;
  flex-direction: column;
  margin-top: 20px;
  padding: 13px 18px;
  border-radius: 12px;
  background: var(--gold);
  color: var(--ink);
  border: 1.5px solid var(--gold-deep);
  text-decoration: none;
  box-shadow: 0 6px 16px rgba(150, 95, 10, 0.22);
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
}
.sd-cta:hover {
  background: #eca522;
  transform: translateY(-1px);
  box-shadow: 0 9px 20px rgba(150, 95, 10, 0.28);
}
.sd-cta:active {
  transform: translateY(1px);
  box-shadow: 0 3px 8px rgba(150, 95, 10, 0.2);
}
.sd-cta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.sd-cta-label {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
}
.sd-cta-hint {
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 500;
}

/* ── GitHub star (secondary) ── */
.sd-star {
  --star-fill: var(--gold);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  font-size: 13.5px;
  line-height: 1.5;
  font-weight: 500;
  color: inherit;
  text-decoration: none;
}
.sd-star span {
  text-decoration: underline;
  text-decoration-color: var(--gold-deep);
  text-decoration-thickness: 1.5px;
  text-underline-offset: 4px;
}
.sd-star:hover span {
  text-decoration-color: var(--ink);
}
.sd-star-ic {
  flex: none;
  fill: var(--star-fill, none);
  stroke: currentColor;
}

/* ── Footer ── */
.sd-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 18px;
  padding-top: 14px;
  border-top: 2px dotted rgba(60, 36, 21, 0.28);
}
.sd-thanks {
  font-size: 13.5px;
  color: var(--ink-soft);
}
.sd-thanks svg {
  color: var(--gold-deep);
  vertical-align: -1px;
  margin-left: 3px;
}
.sd-close {
  font: inherit;
  color: inherit;
  background: none;
  cursor: pointer;
  padding: 9px 16px;
  border: 1.5px solid rgba(60, 36, 21, 0.4);
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  transition: background 0.15s, border-color 0.15s;
}
.sd-close:hover {
  background: rgba(60, 36, 21, 0.07);
  border-color: var(--ink);
}

/* shared icon helpers */
.sd-ext {
  flex: none;
  width: 18px;
  height: 18px;
}
.sd-star .sd-ext {
  width: 14px;
  height: 14px;
  opacity: 0.7;
}
.sd-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.sd-cta:focus-visible,
.sd-star:focus-visible,
.sd-close:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 4px;
}

@keyframes sd-in {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to   { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .sd-card,
  .sd-card *,
  .sd-card *::before,
  .sd-card *::after {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 480px) {
  .sd-backdrop { padding: 12px; }
  .sd-card { padding: 22px 18px 18px; border-radius: 14px; }
  .sd-badge { width: 56px; height: 48px; margin-bottom: 14px; }
  .sd-badge::before { width: 54px; height: 54px; left: -12px; top: -8px; }
  .sd-title { font-size: 26px; }
  .sd-body { font-size: 15px; }
  .sd-cta-label { font-size: 16.5px; }
}
`;
