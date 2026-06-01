/**
 * Toggle — iOS-style on/off switch used across settings panels.
 *
 * Props:
 *   checked  – boolean, whether the toggle is on
 *   onChange – (next: boolean) => void
 */

import React from 'react';

export const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    style={{
      flexShrink: 0,
      width: 36, height: 20, borderRadius: 10, padding: 2,
      border: 'none', cursor: 'pointer',
      background: checked ? 'var(--w-accent)' : 'var(--w-ink-6)',
      transition: 'background 0.18s ease',
    }}
  >
    <div style={{
      width: 16, height: 16, borderRadius: '50%',
      background: '#fff',
      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      transition: 'transform 0.18s ease',
      transform: checked ? 'translateX(16px)' : 'translateX(0)',
    }} />
  </button>
);
