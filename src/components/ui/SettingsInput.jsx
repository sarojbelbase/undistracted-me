import React from 'react';
import { useSettingsStore } from '../../store';
import { Input } from './Input';

/**
 * SettingsInput — pill-shaped input with glass/flat awareness.
 * Wraps Input with a styled container. Caller `style` is merged into
 * the inner Input (never overwrites outline/border/flex).
 *
 * Props:
 *   icon       — leading icon element
 *   prefix     — leading text prefix
 *   suffix     — trailing element
 *   wrapperRef — ref forwarded to the outer div
 *   wrapperStyle — extra styles for the wrapper div
 *   dark       — use dark (inverted) surface
 *   All other props (including style) are forwarded to the inner Input.
 */
export const SettingsInput = React.forwardRef(function SettingsInput(
  { icon, prefix, suffix, wrapperRef, wrapperStyle, dark = false, style, ...inputProps },
  ref,
) {
  const { cardStyle, mode } = useSettingsStore();
  const isGlass = cardStyle === 'glass';
  const isDarkMode = mode === 'dark' || (mode === 'auto' && document.documentElement.dataset.mode === 'dark');
  const isEffectiveDark = dark || isDarkMode;
  let wrapBg, wrapBorder;
  if (isEffectiveDark && isGlass) {
    wrapBg = 'rgba(255,255,255,0.12)';
    wrapBorder = '1px solid rgba(255,255,255,0.16)';
  } else if (isEffectiveDark) {
    wrapBg = 'var(--w-panel-bg)';
    wrapBorder = '1px solid var(--card-border)';
  } else if (isGlass) {
    wrapBg = 'rgba(255,255,255,0.45)';
    wrapBorder = '1px solid rgba(0,0,0,0.09)';
  } else {
    wrapBg = 'var(--w-panel-bg)';
    wrapBorder = undefined;
  }
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
        backgroundColor: wrapBg,
        border: wrapBorder,
        ...wrapperStyle,
      }}
    >
      {icon && (
        <span style={{ flexShrink: 0, color: isEffectiveDark ? 'rgba(255,255,255,0.38)' : 'var(--w-ink-5)', lineHeight: 0 }}>
          {icon}
        </span>
      )}
      {prefix && (
        <span
          style={{
            fontSize: '12px',
            color: isEffectiveDark ? 'rgba(255,255,255,0.28)' : 'var(--w-ink-6)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          {prefix}
        </span>
      )}
      <Input
        ref={ref}
        style={{
          fontSize: '12px',
          fontWeight: 500,
          ...(isEffectiveDark && {
            color: 'rgba(255,255,255,0.88)',
            WebkitTextFillColor: 'rgba(255,255,255,0.88)',
          }),
          ...style,
        }}
        {...inputProps}
      />
      {suffix}
    </div>
  );
});
