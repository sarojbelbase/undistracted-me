import React from 'react';
import { useSettingsStore } from '../../store';
import {
  CANVAS_INPUT_BG,
  CANVAS_INPUT_BORDER,
  CANVAS_INPUT_TEXT,
  CANVAS_INPUT_ICON,
  CANVAS_INPUT_PREFIX,
} from '../../theme/canvas';

/**
 * Input — the single text-input primitive.
 *
 * Bare mode (default) renders a borderless, transparent <input> that fills its
 * container; callers supply their own wrapper (CommandPalette search bar,
 * Focus Mode tasks, notes link editor). Caller `style` is merged on top of the
 * base styles.
 *
 * `pill` mode wraps the same input in a pill-shaped, glass/flat-aware field
 * with optional icon / prefix / suffix. This replaces the former SettingsInput.
 *
 * Props:
 *   pill        — render the pill wrapper (default false)
 *   icon        — leading icon element
 *   prefix      — leading text prefix
 *   suffix      — trailing element
 *   gap         — gap between icon/prefix and input (default: 4px icon, 2px prefix, 6px otherwise)
 *   wrapperRef  — ref forwarded to the outer div
 *   wrapperStyle — extra styles for the wrapper div
 *   dark        — use a dark (inverted) surface
 *   All other props (including style) are forwarded to the inner <input>.
 */
export const Input = React.forwardRef(function Input(
  {
    icon,
    prefix,
    suffix,
    gap,
    wrapperRef,
    wrapperStyle,
    dark = false,
    pill = false,
    style,
    ...inputProps
  },
  ref,
) {
  // Narrow selectors — subscribing to the whole store would re-render every
  // mounted Input on ANY settings change (slider drag, accent toggle, etc.).
  const mode = useSettingsStore((s) => s.mode);
  const cardStyle = useSettingsStore((s) => s.cardStyle);
  const isDarkMode =
    mode === 'dark' ||
    (mode === 'auto' && document.documentElement.dataset.mode === 'dark');
  const isEffectiveDark = dark || isDarkMode;

  const inner = (
    <input
      ref={ref}
      data-ui-input
      style={{
        flex: 1,
        minWidth: 0,
        appearance: 'none',
        WebkitAppearance: 'none',
        background: 'transparent',
        backgroundColor: 'transparent',
        outline: 'none',
        border: 'none',
        color: CANVAS_INPUT_TEXT(isDarkMode),
        WebkitTextFillColor: CANVAS_INPUT_TEXT(isDarkMode),
        caretColor: 'var(--w-accent)',
        ...(pill && {
          fontSize: '12px',
          fontWeight: 500,
          ...(isEffectiveDark && {
            color: CANVAS_INPUT_TEXT(true),
            WebkitTextFillColor: CANVAS_INPUT_TEXT(true),
          }),
        }),
        ...style,
      }}
      {...inputProps}
    />
  );

  if (!pill) return inner;

  const isGlass = cardStyle === 'glass';
  const isComic = cardStyle === 'comic';
  const wrapBg = CANVAS_INPUT_BG(isEffectiveDark, isGlass);
  const wrapBorder = CANVAS_INPUT_BORDER(isEffectiveDark, isGlass, isComic);

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
        <span
          style={{
            flexShrink: 0,
            color: CANVAS_INPUT_ICON(isEffectiveDark),
            lineHeight: 0,
          }}
        >
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
      {inner}
      {suffix}
    </div>
  );
});
