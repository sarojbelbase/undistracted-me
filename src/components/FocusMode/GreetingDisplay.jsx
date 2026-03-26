import React from 'react';

// ── Spacer = clock font-size. Proof:
//   Both clock and greeting are independently centered in `absolute inset-0`
//   flex columns. The greeting column is: [spacer][marginTop][text].
//   For greeting-top = clock-bottom + gap:
//     S + M - G = C + 2*gap  (where S=spacer, M=marginTop, G=greet, C=clock)
//   So S ≈ C achieves near-zero gap, M provides the visible breathing room.
//   The rem floor MUST match the clock's rem floor so the formula holds at
//   small viewport widths where the vw value falls below the rem minimum.
const GREETING_CSS = `
.fm-greeting-spacer { height: clamp(6rem, 18vw, 20rem); flex-shrink: 0; }
.fm-greeting-row    { margin-top: clamp(1.2rem, 2.4vw, 2.4rem); }
.fm-greeting-text   { font-size:  clamp(1.3rem, 2.2vw, 2rem); }
@media (max-width: 899px) and (min-width: 641px) {
  .fm-greeting-spacer { height: clamp(6rem, 16vw, 16rem); }
  .fm-greeting-row    { margin-top: clamp(1rem, 2vw, 2rem); }
  .fm-greeting-text   { font-size:  clamp(1rem, 2vw, 1.6rem); }
}
@media (max-width: 640px) {
  .fm-greeting-spacer { height: clamp(5.5rem, 18vw, 8rem); }
  .fm-greeting-row    { margin-top: clamp(1rem, 2.4vw, 1.8rem); }
  .fm-greeting-text   { font-size:  clamp(1rem, 2.8vw, 1.4rem); }
}`;

const shared = (centerOnDark) => ({
  fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
  textShadow: centerOnDark
    ? '0 1px 14px rgba(0,0,0,0.8)'
    : '0 1px 14px rgba(255,255,255,0.9)',
});

export const GreetingDisplay = ({ parts, centerOnDark }) => (
  <>
    <style>{GREETING_CSS}</style>
    <div
      className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <div className="fm-greeting-spacer" />
      <div className="fm-greeting-row flex items-baseline" style={{ gap: '0.30em' }}>
        <span
          className="fm-greeting-text"
          style={{
            ...shared(centerOnDark),
            fontWeight: 600,
            letterSpacing: '0.01em',
            color: centerOnDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.50)',
          }}
        >
          {parts.greeting.prefix}
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
      </div>
    </div>
  </>
);
