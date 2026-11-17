import { TooltipBtn } from "./TooltipBtn";

/**
 * IconButton — a square icon-only button, the shared replacement for the
 * per-widget `.pocket-icon-btn` pattern. Built on TooltipBtn, so `label`
 * doubles as the accessible name (aria-label) and the hover tooltip.
 *
 * Sizing (via CSS): `md` = 32px default, `sm` = 28px; 40px on coarse pointers,
 * 44px at ≤720px.
 *
 * Props:
 *   label     – string (required); accessible name + tooltip
 *   size      – "md" | "sm" (default "md")
 *   accent    – bool; render as a filled, circular accent button (primary action)
 *   className – extra classes on the button
 *   children  – the icon glyph
 *   ...rest   – forwarded to the underlying <button> (onClick, onMouseDown, …)
 */
export const IconButton = ({ label, size = "md", accent = false, className = "", children, ...rest }) => (
  <TooltipBtn
    tooltip={label}
    aria-label={label}
    className={`um-icon-btn um-icon-btn--${size} ${accent ? "um-icon-btn--accent" : ""} ${className}`}
    {...rest}
  >
    {children}
  </TooltipBtn>
);
