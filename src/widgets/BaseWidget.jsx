import React, { useState, useRef, useEffect, useLayoutEffect, forwardRef } from 'react';
import { createPortal } from 'react-dom';
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
export const BaseWidget = forwardRef(({ children,
  className = '',
  onRemove = null,
  settingsContent = null,
  settingsTitle = 'Settings',
  modalWidth = 'w-80',
  cardStyle = {},
}, ref) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const dropRef = useRef(null);
  // Computed drop position — null until measured
  const [dropStyle, setDropStyle] = useState(null);

  // Close context menu on outside click — check both button and portal dropdown
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      // Close if click is outside the ⋯ button AND outside the portal dropdown
      const inBtn = menuRef.current?.contains(e.target);
      const inDrop = dropRef.current?.contains(e.target);
      if (!inBtn && !inDrop) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // When the dropdown mounts, measure it and compute the best position before paint
  useLayoutEffect(() => {
    if (!menuOpen || !dropRef.current || !btnRef.current) return;
    const M = 8; // min gap from viewport edge
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const btn = btnRef.current.getBoundingClientRect();
    const { width: dw, height: dh } = dropRef.current.getBoundingClientRect();

    // Horizontal: prefer aligning right edge with button's right edge; flip left if needed
    let left = btn.right - dw;
    if (left < M) left = btn.left; // flip to align left edges
    left = Math.max(M, Math.min(left, vw - dw - M));

    // Vertical: prefer below button; flip above when more space there
    const spaceBelow = vh - btn.bottom - M;
    const spaceAbove = btn.top - M;
    let top = (spaceBelow >= dh || spaceBelow >= spaceAbove)
      ? btn.bottom + 4
      : btn.top - dh - 4;
    top = Math.max(M, Math.min(top, vh - dh - M));

    setDropStyle({ position: 'fixed', zIndex: 9999, top, left });
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

      {/* Three-dots button — absolute top-right corner of the widget */}
      {hasMenu && (
        <div ref={menuRef} className="absolute z-20" style={{ top: -14, right: -14, pointerEvents: 'none' }}>
          <button
            ref={btnRef}
            onClick={() => { setDropStyle(null); setMenuOpen(s => !s); }}
            onMouseDown={e => e.stopPropagation()}
            className="w-7 h-7 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all duration-150"
            style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-3)', border: '1px solid var(--w-border)', pointerEvents: 'auto' }}
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
        </div>
      )}

      {/* Dropdown — rendered via portal so it escapes the grid-item CSS transform */}
      {hasMenu && menuOpen && createPortal(
        <div
          ref={dropRef}
          role="menu"
          className="rounded-xl shadow-lg py-1 animate-fade-in"
          style={{
            ...(dropStyle ?? { position: 'fixed', opacity: 0, pointerEvents: 'none', zIndex: 9999 }),
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
        </div>,
        document.body
      )}

      {/* Settings modal */}
      {modalOpen && (
        <BaseSettingsModal title={settingsTitle} onClose={() => setModalOpen(false)} width={modalWidth}>
          {typeof settingsContent === 'function'
            ? settingsContent(() => setModalOpen(false))
            : settingsContent}
        </BaseSettingsModal>
      )}
    </div>
  );
});

BaseWidget.displayName = 'BaseWidget';

