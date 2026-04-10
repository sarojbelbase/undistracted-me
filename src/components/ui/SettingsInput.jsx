import React from 'react';

/**
 * SettingsInput — borderless, surface-2 pill input.
 * Matches the weather location bar style.
 *
 * Props:
 *   icon     — leading icon element (e.g. <GeoAlt size={13} />)
 *   prefix   — leading text prefix (e.g. "https://")
 *   suffix   — trailing element (e.g. a clear button)
 *   wrapperRef — ref forwarded to the outer div (needed for dropdown positioning)
 *   All other props are spread onto the <input> element.
 */
export const SettingsInput = React.forwardRef(function SettingsInput(
  { icon, prefix, suffix, wrapperRef, ...inputProps },
  ref,
) {
  return (
    <div
      ref={wrapperRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        width: '100%',
        boxSizing: 'border-box',
        borderRadius: '12px',
        padding: '0 12px',
        height: '36px',
        backgroundColor: 'var(--w-surface-2)',
      }}
    >
      {icon && (
        <span style={{ flexShrink: 0, color: 'var(--w-ink-5)', lineHeight: 0 }}>
          {icon}
        </span>
      )}
      {prefix && (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--w-ink-6)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        ref={ref}
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: '12px',
          fontWeight: 500,
          background: 'transparent',
          outline: 'none',
          border: 'none',
          color: 'var(--w-ink-1)',
          caretColor: 'var(--w-accent)',
        }}
        {...inputProps}
      />
      {suffix}
    </div>
  );
});
