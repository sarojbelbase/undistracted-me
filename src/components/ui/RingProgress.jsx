import React from 'react';

// ─── Shared ring constants ────────────────────────────────────────────────────

const RING_R = 7;
const RING_CIRC = 2 * Math.PI * RING_R;

// ─── Thin ring progress (accent-tinted) ───────────────────────────────────────
// Used by LookAway overlay and the website blocker blocked page.
// Both render over dark backdrops — track stroke adapts to isDark.

/**
 * @param {object} props
 * @param {number} props.progress  - 0..1 fraction complete
 * @param {string} props.orbRgb    - "r,g,b" string for the progress arc colour
 * @param {boolean} [props.isDark=true] - dark backdrop → lighter track stroke
 * @param {number} [props.size=16] - SVG viewport size in px
 * @param {number} [props.strokeWidth=1.5] - stroke width in SVG units
 */
const RingProgress = ({ progress, orbRgb, isDark = true, size = 16, strokeWidth = 1.5 }) => {
  const r = RING_R;
  const circ = RING_CIRC;
  const dashOffset = circ * (1 - Math.min(1, Math.max(0, progress)));

  const trackColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)';
  const arcColor = `rgba(${orbRgb},0.8)`;

  const vbSize = size + 2;
  const vbCenter = vbSize / 2;

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
