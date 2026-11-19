import { StickyFill } from "react-bootstrap-icons";
import { CANVAS_ICON_MUTED, CANVAS_ICON_LABEL } from "../../theme/canvas";

/**
 * Top-left pill button that opens Note Mode. Sibling of FocusModeButton —
 * positioned by the parent cluster (App.jsx renders both in a flex row).
 * Expands on hover to show its label.
 */
export const NoteModeButton = ({ isDark, onClick }) => (
  <button
    onClick={onClick}
    className="group flex items-center rounded-full transition-all duration-300 focus:outline-none cursor-pointer"
    style={{
      padding: "7px 12px",
      background: "var(--card-bg)",
      backdropFilter: "var(--card-blur)",
      WebkitBackdropFilter: "var(--card-blur)",
      border: "var(--card-border-width, 1px) solid var(--card-border)",
      boxShadow: "var(--card-shadow)",
    }}
  >
    <StickyFill
      size={14}
      className="shrink-0 transition-transform duration-200 group-hover:scale-110"
      style={{ color: CANVAS_ICON_MUTED(isDark) }}
    />
    <span className="max-w-0 overflow-hidden transition-all duration-300 group-hover:max-w-28 opacity-0 group-hover:opacity-100">
      <span
        className="pl-2 text-xs font-semibold whitespace-nowrap select-none tracking-wide"
        style={{ color: CANVAS_ICON_LABEL(isDark) }}
      >
        Note
      </span>
    </span>
  </button>
);
