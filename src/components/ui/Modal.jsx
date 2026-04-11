import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg } from 'react-bootstrap-icons';

/**
 * Shared modal primitive. Handles ESC key, portal, glass/flat surface, no overlay scrim.
 *
 * With `title` prop → renders a standard header (title + close button) with a scrollable body.
 * Without `title`  → renders children directly inside the panel; consumer controls full layout.
 *
 * Props:
 *   title       - string; if provided, renders default header + scrollable body
 *   onClose     - required; called on ESC or close button
 *   children    - body content (title mode) or full layout (no-title mode)
 *   className   - extra Tailwind classes for the panel (e.g. width, flex, maxHeight)
 *   style       - extra inline styles merged onto the panel
 *   maxHeight   - CSS maxHeight applied in title mode (default '70vh')
 *   ariaLabel   - aria-label for the dialog (defaults to title if provided)
 */
export const Modal = ({
  title,
  onClose,
  children,
  className = '',
  style = {},
  maxHeight = '70vh',
  ariaLabel,
}) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const panelStyle = {
    background: 'var(--card-bg)',
    backdropFilter: 'var(--card-blur)',
    WebkitBackdropFilter: 'var(--card-blur)',
    border: '1px solid var(--card-border)',
    boxShadow: 'var(--card-shadow)',
    ...style,
  };

  return createPortal(
    <dialog
      open
      aria-modal="true"
      aria-label={ariaLabel ?? title ?? 'Dialog'}
      tabIndex={-1}
      className="fixed inset-0 z-100 m-0 p-0 max-w-none max-h-none border-0 flex items-center justify-center"
    >
      {title ? (
        <div
          className={`flex flex-col rounded-2xl overflow-hidden animate-fade-in ${className}`}
          style={{ ...panelStyle, maxHeight }}
        >
          <div
            className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <span className="font-semibold text-sm" style={{ color: 'var(--w-ink-1)' }}>
              {title}
            </span>
            <button
              onClick={onClose}
              aria-label={`Close ${title}`}
              className="w-6 h-6 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer"
              style={{ color: 'var(--w-ink-3)' }}
            >
              <XLg size={12} aria-hidden="true" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {children}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-2xl overflow-hidden animate-fade-in ${className}`}
          style={panelStyle}
        >
          {children}
        </div>
      )}
    </dialog>,
    document.body
  );
};
