/**
 * Sparkline — a generic, self-contained sparkline (area + line + end dot).
 * Importable from anywhere; depends only on a `data` array of `{ value }`
 * points (plus an optional `label`). Renders a smooth monotone-cubic curve
 * (Steffen / d3 curveMonotoneX style) over a subtle baseline with an accent
 * gradient fill — used by the Expense tracker for spending, and reusable for
 * any other time-series widget.
 *
 * Props:
 *   data   – Array<{ value: number, label?: string }>; fewer than 2 points
 *            renders a single dot (or nothing when empty)
 *   width  – SVG width  (default 280)
 *   height – SVG height (default 80)
 *   accent – line/fill color (default var(--w-accent))
 */

// Monotone cubic interpolation (Steffen). Produces a smooth, natural curve
// through the data points without overshoot.
function monotoneX(points) {
  const n = points.length;
  if (n < 2) return points;

  // Compute slopes (secants)
  const dx = [], dy = [], s = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = points[i + 1].x - points[i].x;
    dy[i] = points[i + 1].y - points[i].y;
    s[i] = dx[i] === 0 ? 0 : dy[i] / dx[i];
  }

  // First derivatives (m) via Steffen's monotonicity-preserving method
  const m = [];
  m[0] = s[0];
  m[n - 1] = s[n - 2];

  for (let i = 1; i < n - 1; i++) {
    const prev = s[i - 1];
    const curr = s[i];
    if (prev * curr <= 0) {
      m[i] = 0; // sign change → flat
    } else {
      const p = (prev * dx[i] + curr * dx[i - 1]) / (dx[i - 1] + dx[i]);
      const theta = Math.min(Math.max(Math.abs(curr / prev), Math.abs(prev / curr)), 3);
      m[i] = Math.sign(curr) * Math.min(Math.abs(p), theta * Math.min(Math.abs(prev), Math.abs(curr)));
    }
  }

  // Build cubic bezier segments
  const segments = [];
  for (let i = 0; i < n - 1; i++) {
    const x0 = points[i].x, y0 = points[i].y;
    const x1 = points[i + 1].x, y1 = points[i + 1].y;
    const dx1 = dx[i];
    const cp1x = x0 + dx1 / 3;
    const cp1y = y0 + m[i] * dx1 / 3;
    const cp2x = x1 - dx1 / 3;
    const cp2y = y1 - m[i + 1] * dx1 / 3;
    segments.push({ x0, y0, x1, y1, cp1x, cp1y, cp2x, cp2y });
  }
  return segments;
}

export function Sparkline({ data, width = 280, height = 80, accent = 'var(--w-accent)' }) {
  if (!data || data.length < 2) {
    // Single point or empty: tiny dot or nothing
    return (
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
        {data?.length === 1 && data[0].value > 0 && (
          <circle cx={width / 2} cy={height / 2} r="3" fill={accent} opacity="0.6" />
        )}
      </svg>
    );
  }

  const padX = 2;
  const padTop = 12;
  const padBot = 12;
  const chartW = width - padX * 2;
  const chartH = height - padTop - padBot;

  const maxVal = Math.max(...data.map(d => d.value), 1);
  const vals = data.map(d => d.value);
  const minVal = Math.min(...vals, 0);

  // Build normalized points
  const n = data.length;
  const pts = data.map((d, i) => ({
    x: padX + (n === 1 ? chartW / 2 : (i / (n - 1)) * chartW),
    y: padTop + chartH - ((d.value - minVal) / Math.max(maxVal - minVal, 1)) * chartH,
    value: d.value,
    label: d.label,
  }));

  // Ensure at least 2 distinct x positions
  const uniquePts = pts.length > 1 && pts.every(p => p.x === pts[0].x)
    ? [{ x: padX, y: pts[0].y }, { x: padX + chartW, y: pts[pts.length - 1].y }]
    : pts;

  const segments = monotoneX(uniquePts);

  // Build SVG path strings
  let areaD = '';
  let lineD = '';

  if (segments.length === 0 && uniquePts.length >= 2) {
    // Fallback: straight lines
    areaD = `M ${uniquePts[0].x} ${padTop + chartH} L ${uniquePts[0].x} ${uniquePts[0].y}`;
    lineD = `M ${uniquePts[0].x} ${uniquePts[0].y}`;
    for (let i = 1; i < uniquePts.length; i++) {
      areaD += ` L ${uniquePts[i].x} ${uniquePts[i].y}`;
      lineD += ` L ${uniquePts[i].x} ${uniquePts[i].y}`;
    }
    areaD += ` L ${uniquePts[uniquePts.length - 1].x} ${padTop + chartH} Z`;
  } else {
    const first = segments[0];
    areaD = `M ${first.x0} ${padTop + chartH} L ${first.x0} ${first.y0}`;
    lineD = `M ${first.x0} ${first.y0}`;

    for (const seg of segments) {
      areaD += ` C ${seg.cp1x} ${seg.cp1y}, ${seg.cp2x} ${seg.cp2y}, ${seg.x1} ${seg.y1}`;
      lineD += ` C ${seg.cp1x} ${seg.cp1y}, ${seg.cp2x} ${seg.cp2y}, ${seg.x1} ${seg.y1}`;
    }

    const last = segments[segments.length - 1];
    areaD += ` L ${last.x1} ${padTop + chartH} Z`;
  }

  const lastPt = uniquePts[uniquePts.length - 1];
  const gradientId = `spark-grad-${accent.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0" role="img" aria-label="Trend">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.25" />
          <stop offset="50%" stopColor={accent} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accent} stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Subtle baseline */}
      <line
        x1={padX} y1={padTop + chartH}
        x2={padX + chartW} y2={padTop + chartH}
        stroke="var(--w-ink-5)"
        strokeWidth="0.5"
        opacity="0.35"
      />

      {/* Area fill */}
      <path d={areaD} fill={`url(#${gradientId})`} />

      {/* Line */}
      <path d={lineD} fill="none" stroke={accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />

      {/* Last point dot with glow */}
      <circle cx={lastPt.x} cy={lastPt.y} r="5" fill={accent} opacity="0.2" />
      <circle cx={lastPt.x} cy={lastPt.y} r="3.5" fill={accent} stroke="var(--w-bg, #fff)" strokeWidth="2" />
    </svg>
  );
}
