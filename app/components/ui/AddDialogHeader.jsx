import { XLg } from "react-bootstrap-icons";

/**
 * AddDialogHeader — the standard header for every "Add …" dialog (Event,
 * Countdown, Occasion, Pocket, …): an accent icon tile, a title, an optional
 * subtitle, and a single close (✕). Extracted from UnifiedAddDialog so all
 * add/edit dialogs share the same chrome.
 *
 * RULE: any dialog whose job is "add (or edit) a thing" MUST use this header.
 * Keep the icon inside a `--w-accent` tile, title at 15px w-heading, subtitle at
 * w-caption, and the ✕ at 11px in `--w-ink-3`.
 *
 * Props:
 *   icon     – ReactNode; glyph rendered in `--w-accent-fg` on the accent tile
 *   title    – string; dialog heading (e.g. "New Event", "Add to Pocket")
 *   subtitle – string (optional); one-line helper under the title
 *   onClose  – () => void; dismiss handler
 */
export const AddDialogHeader = ({ icon, title, subtitle, onClose }) => (
  <div className="add-dialog-header">
    <div className="add-dialog-header__left">
      <div className="add-dialog-header__icon">{icon}</div>
      <div className="add-dialog-header__text">
        <div className="w-heading" style={{ fontSize: "15px" }}>{title}</div>
        {subtitle ? (
          <div className="w-caption" style={{ marginTop: 1 }}>{subtitle}</div>
        ) : null}
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="add-dialog-header__close"
    >
      <XLg size={11} />
    </button>
  </div>
);
