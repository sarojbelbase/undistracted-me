
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
  // On dark photos: a soft shadow for readability.
  // On light photos: no shadow — dark text contrasts naturally.
  textShadow: centerOnDark
    ? '0 1px 4px rgba(0,0,0,0.60), 0 2px 14px rgba(0,0,0,0.28)'
    : 'none',
});

export const Greetings = ({ parts, centerOnDark, compact = false }) => {
  // Compute once per render — avoids two identical object allocations for the two spans.
  const sharedStyle = shared(centerOnDark);
  return (
    <p className={compact ? 'fm-greeting-compact' : 'fm-greeting-row'} style={{ textAlign: 'center' }}>
      <span
        className={compact ? '' : 'fm-greeting-text'}
        style={{
          ...sharedStyle,
          fontWeight: 600,
          letterSpacing: '0.01em',
          fontSize: compact ? 'clamp(0.85rem, 1.4vw, 1.3rem)' : undefined,
          color: centerOnDark ? 'rgba(255,255,255,0.68)' : 'rgba(0,0,0,0.60)',
        }}
      >
        {parts.greeting.prefix}{' '}
      </span>
      <span
        className={compact ? '' : 'fm-greeting-text'}
        style={{
          ...sharedStyle,
          fontWeight: 700,
          letterSpacing: '-0.01em',
          fontSize: compact ? 'clamp(0.85rem, 1.4vw, 1.3rem)' : undefined,
          color: centerOnDark ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.92)',
        }}
      >
        {parts.greeting.label}
      </span>
    </p>
  );
};
