/**
 * ScrollFade — a decorative gradient overlay that gives a scroll area a
 * "cutout" feel: content fades into the card surface at the edge. Because it
 * fades to `var(--card-bg)`, it is invisible over empty card surface and only
 * reads when content scrolls beneath it. Place it inside a `position: relative`
 * container that wraps the scroll area.
 *
 * Props:
 *   position  – "bottom" | "top" (default "bottom")
 *   className – extra classes
 */
export const ScrollFade = ({ position = "bottom", className = "" }) => (
  <div aria-hidden="true" className={`scroll-fade scroll-fade--${position} ${className}`} />
);
