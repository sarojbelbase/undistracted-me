import React from 'react';

export const GreetingDisplay = ({ parts, centerOnDark }) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
    style={{ zIndex: 20 }}
  >
    <div style={{ height: 'clamp(4rem, 18vw, 20rem)', flexShrink: 0 }} />
    <div
      className="flex items-baseline"
      style={{ gap: '0.30em', marginTop: 'clamp(0.5rem, 1.8vw, 1.8rem)' }}
    >
      <span style={{
        fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
        fontSize: 'clamp(1.3rem, 2.2vw, 2rem)',
        fontWeight: 400,
        letterSpacing: '0.01em',
        color: centerOnDark ? 'rgba(255,255,255,0.52)' : 'rgba(0,0,0,0.50)',
        textShadow: centerOnDark
          ? '0 1px 14px rgba(0,0,0,0.8)'
          : '0 1px 14px rgba(255,255,255,0.9)',
      }}>
        {parts.greeting.prefix}
      </span>
      <span style={{
        fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
        fontSize: 'clamp(1.3rem, 2.2vw, 2rem)',
        fontWeight: 700,
        letterSpacing: '-0.01em',
        color: centerOnDark ? 'rgba(255,255,255,0.96)' : 'rgba(0,0,0,0.90)',
        textShadow: centerOnDark
          ? '0 1px 14px rgba(0,0,0,0.8)'
          : '0 1px 14px rgba(255,255,255,0.9)',
      }}>
        {parts.greeting.label}
      </span>
    </div>
  </div>
);
