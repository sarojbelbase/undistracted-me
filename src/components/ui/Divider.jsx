import React from 'react';
import { CANVAS_DIVIDER, CANVAS_DIVIDER_DARK } from '../../theme/canvas';

/**
 * Divider — a subtle 1px horizontal hairline with optional 20% horizontal inset.
 *
 * Works on both glass and flat surfaces in light and dark modes.
 *
 * Props:
 *   inset  — apply 20% horizontal padding (default: true)
 *   isDark — use dark-mode inverted divider color (default: false)
 *   style  — optional additional inline styles
 *   className — optional additional CSS classes
 */

export const Divider = ({ isDark = false, style, className = '' }) => (
  <div
    aria-hidden="true"
    className={`ui-divider ${className}`}
    style={{
      borderTop: `1.5px solid ${isDark ? CANVAS_DIVIDER_DARK : CANVAS_DIVIDER}`,
      flexShrink: 0,
      width: '90%',
      marginLeft: 'auto',
      marginRight: 'auto',
      ...style,
    }}
  />
);

export default Divider;
