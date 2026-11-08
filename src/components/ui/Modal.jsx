import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { XLg } from "react-bootstrap-icons";

/**
 * Shared modal primitive. Handles ESC key, portal, glass/flat surface, no overlay scrim.
 *
 * With `title` prop → renders a standard header (title + close button) with a scrollable body.
 * Without `title`  → renders children directly inside the panel; consumer controls full layout.
 *
 * Props:
 *   title       - string; if provided, renders default header + scrollable body
 *   onClose     - required; called on ESC or close button
 *   children    - body content (title mode) or full layout (no-title mode)
 *   className   - extra Tailwind classes for the panel (e.g. width, flex, maxHeight)
 *   style       - extra inline styles merged onto the panel
 *   maxHeight   - CSS maxHeight applied in title mode (default '70vh')
 *   ariaLabel   - aria-label for the dialog (defaults to title if provided)
 */
export const Modal = ({
  title,
  onClose,
  children,
  className = "",
  style = {},
  maxHeight = "70vh",
  ariaLabel,
}) => {
  // Capture the previously-focused element during the first render (before any
  // child effect moves focus into the dialog) and restore it on unmount so
  // keyboard users aren't dumped back to <body> after Escape/close.
  const prevFocusRef = useRef(
    typeof document !== "undefined" ? document.activeElement : null,
  );
  const dialogRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Move focus into the dialog on mount (the <dialog> is tabIndex=-1 but was
  // never actually focused, so keyboard/screen-reader users had no target).
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const focusables = el.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusables[0];
    if (first) first.focus();
    else el.focus();
  }, []);

  // Lightweight focus trap — keep Tab/Shift+Tab cycling inside the dialog so
  // focus can't escape to the page behind the modal.
  useEffect(() => {
    const handler = (e) => {
      if (e.key !== "Tab") return;
      const el = dialogRef.current;
      if (!el) return;
      const focusables = [...el.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )].filter((n) => !n.disabled && n.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    return () => {
      const el = prevFocusRef.current;
      if (el && typeof el.focus === "function") el.focus();
    };
  }, []);

  const panelStyle = {
    backgroundColor: "var(--card-bg)",
    backgroundImage: "var(--card-texture, none)",
    backgroundSize: "var(--card-texture-size, auto)",
    backdropFilter: "var(--card-blur)",
    WebkitBackdropFilter: "var(--card-blur)",
    border: "var(--card-border-width, 1px) solid var(--card-border)",
    borderRadius: "var(--card-radius, 1rem)",
    boxShadow: "var(--card-shadow)",
    ...style,
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      open
      aria-modal="true"
      aria-label={ariaLabel ?? title ?? "Dialog"}
      tabIndex={-1}
      className="fixed inset-0 z-100 m-0 p-0 max-w-none max-h-none border-0 flex items-center justify-center"
    >
      {/* Backdrop overlay — click to dismiss */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        onClick={onClose}
        style={{
          background: "var(--modal-overlay-bg)",
          backdropFilter: "var(--modal-overlay-blur)",
          WebkitBackdropFilter: "var(--modal-overlay-blur)",
        }}
      />
      {title ? (
        <div
          className={`relative flex flex-col overflow-hidden animate-fade-in ${className}`}
          style={{ ...panelStyle, maxHeight }}
        >
          <div
            className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
            style={{
              borderBottom: "1.5px solid var(--w-divider)",
            }}
          >
            <span
              className="font-semibold text-sm"
              style={{ color: "var(--w-ink-1)" }}
            >
              {title}
            </span>
            <button
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="w-6 h-6 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer"
              style={{ color: "var(--w-ink-3)" }}
            >
              <XLg size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        </div>
      ) : (
        <div
          className={`relative overflow-hidden animate-fade-in ${className}`}
          style={panelStyle}
        >
          {children}
        </div>
      )}
    </dialog>,
    document.body,
  );
};
