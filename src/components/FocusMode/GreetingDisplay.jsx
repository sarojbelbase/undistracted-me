
// ── Spacer = clock font-size. Proof:
//   Both clock and greeting are independently centered in `absolute inset-0`
//   flex columns. The greeting column is: [spacer][marginTop][text].
//   For greeting-top = clock-bottom + gap:
//     S + M - G = C + 2*gap  (where S=spacer, M=marginTop, G=greet, C=clock)
//   So S ≈ C achieves near-zero gap, M provides the visible breathing room.
//   The rem floor MUST match the clock's rem floor so the formula holds at
//   small viewport widths where the vw value falls below the rem minimum.

const shared = (centerOnDark) => ({
  fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
  textShadow: centerOnDark
    ? '0 1px 14px rgba(0,0,0,0.8)'
    : '0 1px 14px rgba(255,255,255,0.9)',
});

export const GreetingDisplay = ({ parts, centerOnDark }) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
    style={{ zIndex: 20 }}
  >
    <div className="fm-greeting-spacer" />
    <p className="fm-greeting-row">
      <span
        className="fm-greeting-text"
        style={{
          ...shared(centerOnDark),
          fontWeight: 600,
          letterSpacing: '0.01em',
          color: centerOnDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.50)',
        }}
      >
        {parts.greeting.prefix}{' '}
      </span>
      <span
        className="fm-greeting-text"
        style={{
          ...shared(centerOnDark),
          fontWeight: 700,
          letterSpacing: '-0.01em',
          color: centerOnDark ? 'rgba(255,255,255,0.96)' : 'rgba(0,0,0,0.90)',
        }}
      >
        {parts.greeting.label}
      </span>
    </p>
  </div>
);
