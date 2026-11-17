/**
 * Button — the shared labelled button. Replaces the inline `primaryBtn` /
 * `secondaryBtn` objects and the `.pocket-action-btn` class.
 *
 * Variants:
 *   primary   – solid accent fill
 *   secondary – outlined (panel surface + card border)
 *   ghost     – text only, transparent
 *   danger    – red outline, red text
 *
 * Text never wraps (`white-space: nowrap`); on coarse pointers it enforces a
 * 44px min touch height (via CSS). Focus ring is the global accent outline.
 *
 * Props:
 *   variant – "primary" | "secondary" | "ghost" | "danger" (default "secondary")
 *   size    – "md" | "sm" (default "md")
 *   ...rest – forwarded to <button> (onClick, disabled, style, …)
 */
export const Button = ({ variant = "secondary", size = "md", className = "", children, ...rest }) => (
  <button
    type="button"
    className={`um-btn um-btn--${variant} um-btn--${size} ${className}`}
    {...rest}
  >
    {children}
  </button>
);
