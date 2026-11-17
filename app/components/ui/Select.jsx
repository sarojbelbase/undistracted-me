import React from 'react';
import { ChevronDown } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import {
  CANVAS_INPUT_BG,
  CANVAS_INPUT_BORDER,
  CANVAS_INPUT_TEXT,
  CANVAS_INPUT_ICON,
} from '../../theme/canvas';

/**
 * Select — the dropdown primitive, styled identically to `Input`'s pill wrapper
 * so selects and text inputs are visually interchangeable in settings panels.
 *
 * Mirrors Input.jsx: the wrapper is a glass/flat-aware pill (CANVAS_INPUT_*),
 * and the inner <select> is appearance-less and transparent so the wrapper's
 * surface shows through. The inner select carries `data-ui-input` so the global
 * dark-mode reset (which targets native, unstyled controls) leaves it alone.
 *
 * Props:
 *   icon         — leading icon element
 *   chevron      — trailing chevron element (defaults to ChevronDown)
 *   wrapperRef   — ref forwarded to the outer div
 *   wrapperStyle — extra styles for the wrapper div
 *   All other props (including style) are forwarded to the inner <select>.
 */
export const Select = React.forwardRef(function Select(
  {
    icon,
    chevron = <ChevronDown size={12} />,
    wrapperRef,
    wrapperStyle,
    style,
    children,
    ...selectProps
  },
  ref,
) {
  const mode = useSettingsStore((s) => s.mode);
  const cardStyle = useSettingsStore((s) => s.cardStyle);
  const isDarkMode =
    mode === 'dark' ||
    (mode === 'auto' && document.documentElement.dataset.mode === 'dark');
  const isGlass = cardStyle === 'glass';
  const isComic = cardStyle === 'comic';
  const wrapBg = CANVAS_INPUT_BG(isDarkMode, isGlass);
  const wrapBorder = CANVAS_INPUT_BORDER(isDarkMode, isGlass, isComic);
  const textColor = CANVAS_INPUT_TEXT(isDarkMode);
  const iconColor = CANVAS_INPUT_ICON(isDarkMode);

  return (
    <div
      ref={wrapperRef}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: icon ? '4px' : '6px',
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
        <span style={{ flexShrink: 0, color: iconColor, lineHeight: 0 }}>
          {icon}
        </span>
      )}
      <select
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
          color: textColor,
          WebkitTextFillColor: textColor,
          colorScheme: isDarkMode ? 'dark' : 'light',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          ...style,
        }}
        {...selectProps}
      >
        {children}
      </select>
      <span
        style={{
          flexShrink: 0,
          color: iconColor,
          lineHeight: 0,
          pointerEvents: 'none',
        }}
      >
        {chevron}
      </span>
    </div>
  );
});
