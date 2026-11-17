import { XLg } from "react-bootstrap-icons";
import { IconButton } from "./IconButton";

/**
 * WidgetHeaderFull — the defacto header for a widget's *expanded* view. Mirrors
 * WidgetHeader's icon/title/count sizing on the left (so the card and its
 * expanded view read as the same surface), and puts a small set of actions plus
 * a single dismiss (✕) on the right — nothing more.
 *
 * The host controls the panel width via the Modal's className (e.g. Pocket's
 * `.pocket-modal-shell`). Keeping width here instead of on the header lets any
 * expanded view share the same header chrome at whatever size it needs.
 *
 * Props:
 *   icon      – ReactNode; leading glyph (rendered in the accent color)
 *   title     – string; widget name
 *   count     – string|number (optional); muted count next to the title
 *   leading   – ReactNode (optional); rendered before the icon (e.g. a mobile
 *               "Library" toggle); hidden from the icon/title sizing
 *   actions   – ReactNode[]; right-side action buttons (e.g. a "+ Add" button)
 *   onClose   – () => void; dismiss handler for the trailing ✕
 *   className – extra classes on the header row
 */
export const WidgetHeaderFull = ({ icon, title, count, leading, actions = [], onClose, className = "" }) => (
  <header className={`widget-header-full ${className}`}>
    <div className="widget-header-full__left">
      {leading}
      <span className="widget-header__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="widget-header__title">{title}</span>
      {count != null && count !== "" && <span className="widget-header__count">{count}</span>}
    </div>
    <div className="widget-header-full__actions">
      {actions}
      <IconButton label="Close" size="sm" onClick={onClose}>
        <XLg size={14} />
      </IconButton>
    </div>
  </header>
);
