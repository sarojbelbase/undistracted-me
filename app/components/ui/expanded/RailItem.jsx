/**
 * RailItem: one row in an expanded view's left navigation. A shared primitive
 * so Pocket (kinds/folders) and Expense (categories) render identical rows:
 * optional leading icon, optional color dot, a truncated label and a trailing
 * count. Active state uses the shared `.pocket-rail-item--active` styling.
 *
 * Props:
 *   active    – bool; highlights the row (aria-current)
 *   onClick   – () => void
 *   icon      – ReactNode (optional); leading glyph (colored inline by caller)
 *   colorDot  – ReactNode (optional); a small color swatch before the label
 *   label     – string; the row text (truncated)
 *   count     – string|number (optional); muted trailing count
 *   className – extra classes
 */
export function RailItem({ active = false, onClick, icon, label, count, colorDot, className = "" }) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      className={`pocket-rail-item ${active ? "pocket-rail-item--active" : ""} ${className}`}
      onClick={onClick}
    >
      {icon && <span className="pocket-rail-item__icon">{icon}</span>}
      {colorDot}
      <span className="flex-1 text-left truncate">{label}</span>
      {count != null && count !== "" && <span className="w-caption">{count}</span>}
    </button>
  );
}
