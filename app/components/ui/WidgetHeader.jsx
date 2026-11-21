/**
 * WidgetHeader: the shared, consistently-sized header used at the top of a
 * widget card: an accent icon, a title, an optional muted count and a set of
 * right-aligned action buttons. Standardizes the icon/title/action sizing so
 * every widget header (Expense, Pocket, …) looks the same.
 *
 * Props:
 *   icon      – ReactNode; the leading glyph (rendered in the accent color)
 *   title     – string; the widget name
 *   count     – string|number (optional); a muted count to the right of the title
 *   actions   – ReactNode[]; icon buttons, evenly spaced on the right
 *   className – extra classes on the header row
 */
export const WidgetHeader = ({ icon, title, count, actions = [], className = "" }) => (
  <div className={`widget-header ${className}`}>
    <span className="widget-header__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="widget-header__title">{title}</span>
    {count != null && count !== "" && <span className="widget-header__count">{count}</span>}
    <div className="widget-header__spacer" />
    <div className="widget-header__actions">{actions}</div>
  </div>
);
