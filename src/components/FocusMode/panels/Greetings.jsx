
// ── Spacer = clock font-size. Proof:
//   Both clock and greeting are independently centered in `absolute inset-0`
//   flex columns. The greeting column is: [spacer][marginTop][text].
//   For greeting-top = clock-bottom + gap:
//     S + M - G = C + 2*gap  (where S=spacer, M=marginTop, G=greet, C=clock)
//   So S ≈ C achieves near-zero gap, M provides the visible breathing room.
//   The rem floor MUST match the clock's rem floor so the formula holds at
//   small viewport widths where the vw value falls below the rem minimum.

import { getPhotoTokens } from '../theme';

export const Greetings = ({ parts, centerOnDark, compact = false }) => {
  const photo = getPhotoTokens(centerOnDark);
  return (
    <p className={compact ? 'fm-greeting-compact' : 'fm-greeting-row'} style={{ textAlign: 'center' }}>
      <span
        className={compact ? '' : 'fm-greeting-text'}
        style={{
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          fontWeight: 600,
          letterSpacing: '0.01em',
          fontSize: compact ? 'clamp(0.85rem, 1.4vw, 1.3rem)' : undefined,
          color: photo.greetPrefix,
          textShadow: photo.greetShadow,
        }}
      >
        {parts.greeting.prefix}{' '}
      </span>
      <span
        className={compact ? '' : 'fm-greeting-text'}
        style={{
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.01em',
          fontSize: compact ? 'clamp(0.85rem, 1.4vw, 1.3rem)' : undefined,
          color: photo.greetName,
          textShadow: photo.greetShadow,
        }}
      >
        {parts.greeting.label}
      </span>
    </p>
  );
};
