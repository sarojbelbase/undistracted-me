import React from 'react';
import { useSettingsStore } from '../../store';

/**
 * Input — bare <input> with theme-aware defaults.
 * - No outline, no border, transparent background
 * - flex: 1 so it fills its container
 * - color and caretColor auto-adapt to dark/light mode
 * - Caller style is MERGED on top of base styles (never overwrites them)
 *
 * All props are forwarded to <input>.
 */
export const Input = React.forwardRef(function Input({ style, ...props }, ref) {
  const { mode } = useSettingsStore();
  const isDark = mode === 'dark' || (mode === 'auto' && document.documentElement.dataset.mode === 'dark');
  return (
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
        color: isDark ? 'rgba(255,255,255,0.88)' : 'var(--w-ink-1)',
        WebkitTextFillColor: isDark ? 'rgba(255,255,255,0.88)' : 'var(--w-ink-1)',
        caretColor: 'var(--w-accent)',
        ...style,
      }}
      {...props}
    />
  );
});
