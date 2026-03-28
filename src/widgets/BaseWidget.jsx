import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { BaseSettingsModal } from './BaseSettingsModal';

/**
 * Base card wrapper for all widgets.
 *
 * Props:
 *  - settingsContent: JSX or (onClose) => JSX rendered inside the settings modal.
 *    When provided, a ⋯ button appears on hover that opens the modal.
 *    When a function, it receives `onClose` so the content can auto-close
 *    (e.g. stock selector closes after picking a symbol).
 *  - settingsTitle: Title shown in the modal header. Defaults to "Settings".
 *  - onRemove: Called when user picks "Remove" from the context menu.
 *  - ref: forwarded to the outer wrapper div (for ResizeObserver / sizing).
 */
export const BaseWidget = forwardRef(({
  children,
  className = '',
  onRemove = null,
  settingsContent = null,
  settingsTitle = 'Settings',
  cardStyle = {},
}, ref) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuRef = useRef(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const hasMenu = settingsContent || onRemove;

  return (
    <div ref={ref} className="relative h-full group">
      <div
        className={`rounded-2xl shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col overflow-hidden h-full ${className}`}
        style={{ backgroundColor: 'var(--w-surface)', color: 'var(--w-ink-1)', ...cardStyle }}
      >
        {children}
      </div>

      {/* Three-dots context menu — floats outside card, top-right corner */}
      {hasMenu && (
        <div ref={menuRef} className="absolute z-20" style={{ top: -14, right: -14 }}>
          <button
            onClick={() => setMenuOpen(s => !s)}
            onMouseDown={e => e.stopPropagation()}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-150"
            style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-3)', border: '1px solid var(--w-border)' }}
            aria-label="Widget options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor" aria-hidden="true">
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="7" cy="2" r="1.5" />
              <circle cx="12" cy="2" r="1.5" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-9 z-40 rounded-xl shadow-lg py-1 animate-fade-in"
              style={{
                backgroundColor: 'var(--w-surface)',
                border: '1px solid var(--w-border)',
                minWidth: 130,
              }}
            >
              {settingsContent && (
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); setModalOpen(true); }}
                  onMouseDown={e => e.stopPropagation()}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-left transition-opacity hover:opacity-70"
                  style={{ color: 'var(--w-ink-1)' }}
                >
                  Settings
                </button>
              )}
              {onRemove && (
                <button
                  role="menuitem"
                  onClick={() => { setMenuOpen(false); onRemove(); }}
                  onMouseDown={e => e.stopPropagation()}
                  className="flex items-center w-full px-4 py-2.5 text-sm text-left transition-opacity hover:opacity-70"
                  style={{ color: '#ef4444' }}
                >
                  Remove
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings modal */}
      {modalOpen && (
        <BaseSettingsModal title={settingsTitle} onClose={() => setModalOpen(false)}>
          {typeof settingsContent === 'function'
            ? settingsContent(() => setModalOpen(false))
            : settingsContent}
        </BaseSettingsModal>
      )}
    </div>
  );
});

BaseWidget.displayName = 'BaseWidget';

