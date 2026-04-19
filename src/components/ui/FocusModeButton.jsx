import React from 'react';
import { MoonStarsFill } from 'react-bootstrap-icons';
import { focusShortcut } from '../../hooks/useFocusMode';

/**
 * Top-left pill button that opens Focus Mode.
 * Expands on hover to show the keyboard shortcut label.
 */
export const FocusModeButton = ({ isDark, onClick }) => (
  <div className="absolute top-5 left-5 z-50">
    <button
      onClick={onClick}
      className="group flex items-center rounded-full transition-all duration-300 focus:outline-none cursor-pointer"
      style={{
        padding: '7px 12px',
        background: 'var(--card-bg)',
        backdropFilter: 'var(--card-blur)',
        WebkitBackdropFilter: 'var(--card-blur)',
        border: '1px solid var(--card-border)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <MoonStarsFill
        size={14}
        className="shrink-0 transition-transform duration-200 group-hover:scale-110"
        style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)' }}
      />
      <span className="max-w-0 overflow-hidden transition-all duration-300 group-hover:max-w-28 opacity-0 group-hover:opacity-100">
        <span
          className="pl-2 text-xs font-semibold whitespace-nowrap select-none tracking-wide"
          style={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)' }}
        >
          Focus <span style={{ opacity: 0.55, fontSize: '10px', fontWeight: 500 }}>{focusShortcut}</span>
        </span>
      </span>
    </button>
  </div>
);
