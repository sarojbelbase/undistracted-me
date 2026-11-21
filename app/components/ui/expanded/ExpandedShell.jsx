import { useEffect, useState } from "react";
import { List } from "react-bootstrap-icons";
import { Modal } from "../Modal";
import { Button } from "../Button";
import { WidgetHeaderFull } from "../WidgetHeaderFull";
import { ScrollFade } from "../ScrollFade";

/**
 * ExpandedShell: the shared "expanded view" skeleton used by Pocket and
 * Expense (and any future list-heavy widget). It owns the cross-cutting chrome
 * and behaviour so each widget only supplies its own data:
 *
 *   ┌──────────────────────────────────────────────────────┐
 *   │ header (icon · title · count · [Library toggle] · ✕) │
 *   ├──────────┬───────────────────────────────────────────┤
 *   │  rail    │  toolbar (search · add · title · trailing)│
 *   │ (slot)   │  subheader (optional, e.g. a graph)       │
 *   │          │  body (scrollable slot)                   │
 *   └──────────┴───────────────────────────────────────────┘
 *
 * Layout CSS reuses the shared `.pocket-*` classes that Pocket's expanded view
 * originally introduced; they are generic (rail/main split, toolbar, drawer)
 * and already theme + responsive aware, so both widgets share one visual.
 *
 * The rail collapses into a left drawer on small screens via a "Library"
 * toggle in the header; the "/" key focuses the search field.
 *
 * Props:
 *   icon, title, count, onClose, ariaLabel – header content
 *   rail         – ReactNode; the left navigation
 *   toolbar      – ReactNode; search + add + title (see SearchToolbar)
 *   subheader    – ReactNode (optional); pinned between toolbar and body
 *   children     – ReactNode; scrollable body content
 *   bodyClassName– extra classes on the scrollable body (e.g. compact density)
 *   searchRef    – ref to the search input (for "/" focus + initial focus)
 *   libraryLabel – text on the mobile drawer toggle (default "Library")
 */
export function ExpandedShell({
  icon,
  title,
  count,
  onClose,
  ariaLabel,
  rail,
  toolbar,
  subheader = null,
  children,
  bodyClassName = "",
  searchRef,
  libraryLabel = "Library",
}) {
  const [railOpen, setRailOpen] = useState(false);

  // "/" focuses search (ignored when already typing).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "/") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef?.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchRef]);

  // Focus the search field on open. The shared Modal focuses the first
  // focusable element, which here is the mobile-only Library toggle
  // (display:none on desktop), so initial focus would otherwise fail silently.
  useEffect(() => {
    searchRef?.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal onClose={onClose} className="pocket-modal-shell" ariaLabel={ariaLabel}>
      <div className="pocket-modal">
        <WidgetHeaderFull
          className="pocket-modal__head"
          icon={icon}
          title={title}
          count={count}
          leading={
            <Button variant="ghost" size="sm" className="pocket-library-toggle" onClick={() => setRailOpen(true)}>
              <List size={13} />
              {libraryLabel}
            </Button>
          }
          onClose={onClose}
        />

        <div className={`pocket-expanded ${railOpen ? "pocket-expanded--rail-open" : ""}`}>
          {rail}
          <div className="pocket-main">
            {toolbar}
            {subheader}
            <div className={`pocket-expanded__body ${bodyClassName}`}>{children}</div>
          </div>
        </div>

        <ScrollFade />

        {railOpen && (
          <div className="pocket-rail-backdrop" onClick={() => setRailOpen(false)} aria-hidden="true" />
        )}
      </div>
    </Modal>
  );
}
