import { getPhotoTokens } from '../theme';

const DigitRoller = ({ char }) => (
  <span
    style={{
      display: 'inline-block',
      fontVariantNumeric: 'tabular-nums',
      animation: 'focusDigitIn 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
    }}
  >
    {char}
  </span>
);

export const Clock = ({ parts, centerOnDark, compact = false }) => {
  const photo = getPhotoTokens(centerOnDark);
  return (
    <div
      className={compact ? 'fm-clock-compact flex items-center select-none pointer-events-none' : 'flex items-center select-none pointer-events-none'}
    >
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'flex-start' }}>
        <div
          className={compact ? 'fm-clock-text-compact flex items-center' : 'fm-clock-text flex items-center'}
          style={{
            fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: photo.clockColor,
            lineHeight: 1,
            textShadow: photo.clockShadow,
          }}
        >
          {parts.time.split('').map((char, i) =>
            char === ':' ? (
              <span
                key={`sep-${i}-${char}`} // NOSONAR: time string chars at fixed positions — array index is the stable position identifier
                style={{
                  fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
                  lineHeight: 1, height: '1em', display: 'flex', alignItems: 'center',
                  paddingBottom: '0.05em',
                  color: photo.colonColor,
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
            fontSize: compact ? 'clamp(0.9rem, 1.4vw, 1.6rem)' : 'clamp(1.2rem, 2vw, 2.4rem)',
            fontFamily: "'Google Sans', ui-sans-serif, sans-serif",
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
            position: 'absolute',
            left: 'calc(100% + 0.15em)',
            top: '0.3em',
            color: photo.periodColor,
            textShadow: photo.periodShadow,
          }}>
            {parts.period}
          </span>
        )}
      </div>
    </div>
  );
};

export default DigitRoller;
export { Clock as ClockDisplay };
