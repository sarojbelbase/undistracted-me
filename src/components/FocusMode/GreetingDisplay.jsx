
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
    ? '0 1px 12px rgba(0,0,0,0.85), 0 4px 32px rgba(0,0,0,0.5)'
    : '0 1px 12px rgba(255,255,255,0.95), 0 4px 24px rgba(255,255,255,0.7)',
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
          color: centerOnDark ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.60)',
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
          color: centerOnDark ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.92)',
        }}
      >
        {parts.greeting.label}
      </span>
    </p>
  </div>
);
