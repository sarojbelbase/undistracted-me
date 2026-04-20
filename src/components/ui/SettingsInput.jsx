import React from 'react';
import { useSettingsStore } from '../../store';
import { Input } from './Input';
import {
  CANVAS_INPUT_BG,
  CANVAS_INPUT_BORDER,
  CANVAS_INPUT_TEXT,
  CANVAS_INPUT_ICON,
  CANVAS_INPUT_PREFIX,
} from '../../theme/canvas';

/**
 * SettingsInput — pill-shaped input with glass/flat awareness.
 * Wraps Input with a styled container. Caller `style` is merged into
 * the inner Input (never overwrites outline/border/flex).
 *
 * Props:
 *   icon       — leading icon element
 *   prefix     — leading text prefix
 *   suffix     — trailing element
 *   gap        — gap between icon/prefix and input (default: 4px for icon, 2px for prefix, 6px otherwise)
 *   wrapperRef — ref forwarded to the outer div
 *   wrapperStyle — extra styles for the wrapper div
 *   dark       — use dark (inverted) surface
 *   All other props (including style) are forwarded to the inner Input.
 */
export const SettingsInput = React.forwardRef(function SettingsInput(
  { icon, prefix, suffix, gap, wrapperRef, wrapperStyle, dark = false, style, ...inputProps },
  ref,
) {
  const { cardStyle, mode } = useSettingsStore();
  const isGlass = cardStyle === 'glass';
  const isDarkMode = mode === 'dark' || (mode === 'auto' && document.documentElement.dataset.mode === 'dark');
  const isEffectiveDark = dark || isDarkMode;
  const wrapBg = CANVAS_INPUT_BG(isEffectiveDark, isGlass);
  const wrapBorder = CANVAS_INPUT_BORDER(isEffectiveDark, isGlass);
  return (
    <div
      ref={wrapperRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: gap ?? (icon ? '4px' : prefix ? '2px' : '6px'),
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
        <span style={{ flexShrink: 0, color: CANVAS_INPUT_ICON(isEffectiveDark), lineHeight: 0 }}>
          {icon}
        </span>
      )}
      {prefix && (
        <span
          style={{
            fontSize: '12px',
            color: CANVAS_INPUT_PREFIX(isEffectiveDark),
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
            color: CANVAS_INPUT_TEXT(true),
            WebkitTextFillColor: CANVAS_INPUT_TEXT(true),
          }),
          ...style,
        }}
        {...inputProps}
      />
      {suffix}
    </div>
  );
});
