import React from 'react';
import DigitRoller from './DigitRoller';

export const ClockDisplay = ({ parts, centerOnDark }) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
    style={{ zIndex: 18 }}
  >
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start' }}>
      <div
        className="flex items-center"
        style={{
          fontSize: 'clamp(9rem, 26vw, 32rem)',
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: centerOnDark ? 'rgba(255,255,255,0.92)' : 'rgba(0,0,0,0.82)',
          lineHeight: 1,
          textShadow: centerOnDark
            ? '0 1px 0 rgba(0,0,0,0.12), 0 4px 24px rgba(0,0,0,0.28)'
            : '0 1px 0 rgba(255,255,255,0.3), 0 4px 24px rgba(255,255,255,0.5)',
        }}
      >
        {parts.time.split('').map((char, i) =>
          char === ':' ? (
            <span
              key={i}
              style={{
                fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
                lineHeight: 1, height: '1em', display: 'flex', alignItems: 'center',
                paddingBottom: '0.05em',
                color: centerOnDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.52)',
                marginInline: '0.015em',
              }}
            >:</span>
          ) : (
            <DigitRoller key={`${i}-${char}`} char={char} />
          )
        )}
      </div>
      {parts.period && (
        <span style={{
          fontSize: 'clamp(0.75rem, 1.3vw, 1.5rem)',
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
          position: 'absolute',
          left: 'calc(100% + 0.15em)',
          top: '0.3em',
          color: centerOnDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.45)',
          textShadow: centerOnDark
            ? '0 1px 10px rgba(0,0,0,0.65)'
            : '0 1px 10px rgba(255,255,255,0.8)',
        }}>
          {parts.period}
        </span>
      )}
    </div>
  </div>
);
