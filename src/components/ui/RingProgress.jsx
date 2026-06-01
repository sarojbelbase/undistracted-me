import React from 'react';

// ─── Shared ring constants ────────────────────────────────────────────────────

const RING_R = 7;
const RING_CIRC = 2 * Math.PI * RING_R;

// ─── Thin ring progress (accent-tinted) ───────────────────────────────────────
// Used by LookAway overlay, website blocker blocked page, and Pomodoro widget.
// LookAway / blocker render over dark backdrops — track stroke adapts to isDark.
// Pomodoro renders on widget cards — uses `color` prop for CSS variable support.

/**
 * @param {object} props
 * @param {number} props.progress   - 0..1 fraction complete
 * @param {string} [props.orbRgb]   - "r,g,b" string for the progress arc colour (LookAway / blocker)
 * @param {string} [props.color]    - CSS color value for the arc (Pomodoro). Takes precedence over orbRgb.
 * @param {boolean} [props.isDark=true] - dark backdrop → lighter track stroke
 * @param {number} [props.size=16]  - SVG viewport size in px
 * @param {number} [props.strokeWidth=1.5] - stroke width in SVG units
 * @param {number} [props.radius]   - circle radius. Defaults to RING_R (7) for small rings;
 *                                     use ~46-50 for larger Pomodoro-style rings with size ~100-110.
 */
const RingProgress = ({ progress, orbRgb, color, isDark = true, size = 16, strokeWidth = 1.5, radius }) => {
  const r = radius ?? RING_R;
  const circ = 2 * Math.PI * r;

  // When radius is explicitly provided, auto-size the viewport to fit
  const padding = strokeWidth + 1;
  const vbSize = radius ? (r + padding) * 2 : size + 2;
  const vbCenter = vbSize / 2;

  const dashOffset = circ * (1 - Math.min(1, Math.max(0, progress)));

  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const arcColor = color || (orbRgb ? `rgba(${orbRgb},0.8)` : 'var(--w-accent)');

  return (
    <svg width={size} height={size} viewBox={`0 0 ${vbSize} ${vbSize}`} fill="none" aria-hidden>
      <circle cx={vbCenter} cy={vbCenter} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={vbCenter} cy={vbCenter} r={r}
        stroke={arcColor}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={dashOffset}
        transform={`rotate(-90 ${vbCenter} ${vbCenter})`}
        style={{ transition: 'stroke-dashoffset 1.05s linear' }}
      />
    </svg>
  );
};

export default React.memo(RingProgress);
