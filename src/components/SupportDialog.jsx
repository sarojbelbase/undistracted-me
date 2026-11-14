/**
 * SupportDialog — "Help <app> keep growing" support nudge (riso print style).
 *
 * Presentational only: it takes `open` / `onClose` and renders nothing when
 * closed. `SupportNudge` (in ./SupportNudge) is the connected wrapper that
 * reads the support store and supplies the real app name + links, so the app
 * just mounts `<SupportNudge />` once and completion points call
 * `triggerSupportNudge(...)`.
 *
 * Visual language: a warm two-ink riso print — chestnut and marigold on butter
 * paper, a pleated momo mark on a gold circle, halftone dot corner, film-grain
 * texture, and a bold "Buy Me a Momo" call-to-action. Portrait card (400px max)
 * that fits the viewport; it tightens on short screens and only scrolls as a
 * last resort.
 *
 * Styles live in src/styles/_support.scss (scoped `.sd-*` classes). Font is
 * "Bricolage Grotesque" (500 / 800), loaded once in the app (self-hosted) —
 * this component never makes a third-party request.
 */

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { StarFill, BoxArrowUpRight } from "react-bootstrap-icons";
import { MomoMark } from "../assets/svg/MomoMark";
import { MOMO_URL, GITHUB_URL } from "../constants/urls";

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
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="sd-backdrop" onClick={onClose}>
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
          helps, Buy Me a Momo is the only way to chip in, even a snack&rsquo;s
          worth.
        </p>
        <p className="sd-body sd-note">
          I&rsquo;m testing this support model for 3 months. If it can&rsquo;t
          cover hosting and servers, I&rsquo;ll need to switch to a paid model.
        </p>

        <a
          className="sd-cta"
          href={momoUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="sd-cta-row">
            <span className="sd-cta-label">Support on Buy Me a Momo</span>
            <BoxArrowUpRight className="sd-ext" aria-hidden="true" />
          </span>
          <span className="sd-cta-hint">External link, opens in new tab</span>
        </a>

        {githubUrl && (
          <a
            className="sd-star"
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <StarFill className="sd-star-ic" aria-hidden="true" />
            <span>
              A GitHub star helps others find {appName}. It means a lot.
              <span className="sr-only"> (External link, opens in new tab)</span>
            </span>
            <BoxArrowUpRight className="sd-ext" aria-hidden="true" />
          </a>
        )}

        <footer className="sd-footer">
          <p className="sd-thanks">Thank you for staying and using it.</p>
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
