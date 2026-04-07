import DigitRoller from './DigitRoller';

export const ClockDisplay = ({ parts, centerOnDark }) => (
  <div
    className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
    style={{ zIndex: 18 }}
  >
    <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start' }}>
      <div
        className="fm-clock-text flex items-center"
        style={{
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          fontWeight: 700,
          letterSpacing: '-0.02em',
          color: centerOnDark ? 'rgba(255,255,255,0.97)' : 'rgba(0,0,0,0.88)',
          lineHeight: 1,
          textShadow: centerOnDark
            ? '0 2px 4px rgba(0,0,0,0.5), 0 4px 32px rgba(0,0,0,0.72), 0 8px 64px rgba(0,0,0,0.4)'
            : '0 1px 0 rgba(255,255,255,0.9), 0 2px 16px rgba(255,255,255,0.7), 0 4px 32px rgba(0,0,0,0.08)',
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
                color: centerOnDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.56)',
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
          fontSize: 'clamp(1.2rem, 2vw, 2.4rem)',
          fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          lineHeight: 1,
          position: 'absolute',
          left: 'calc(100% + 0.15em)',
          top: '0.3em',
          color: centerOnDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.55)',
          textShadow: centerOnDark
            ? '0 1px 8px rgba(0,0,0,0.7)'
            : '0 1px 8px rgba(255,255,255,0.95)',
        }}>
          {parts.period}
        </span>
      )}
    </div>
  </div>
);
