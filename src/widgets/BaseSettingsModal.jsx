import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg } from 'react-bootstrap-icons';

/**
 * Reusable settings modal used by all widgets via BaseWidget.
 * Renders as a centered portal overlay with backdrop blur.
 * Dismisses on ESC or backdrop click.
 */
export const BaseSettingsModal = ({ title = 'Settings', onClose, children, width = 'w-80' }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <dialog
      open
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
      className="fixed inset-0 z-100 m-0 p-0 max-w-none max-h-none border-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className={`flex flex-col rounded-2xl shadow-2xl ${width} overflow-hidden animate-fade-in`}
        style={{
          background: 'var(--card-bg)',
          backdropFilter: 'var(--card-blur)',
          WebkitBackdropFilter: 'var(--card-blur)',
          border: '1px solid var(--card-border)',
          boxShadow: 'var(--card-shadow)',
          maxHeight: '70vh',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0"
          style={{ borderBottom: '1px solid var(--card-border)' }}
        >
          <span className="font-semibold text-sm" style={{ color: 'var(--w-ink-1)' }}>
            {title}
          </span>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer"
            style={{ color: 'var(--w-ink-3)' }}
          >
            <XLg size={12} aria-hidden="true" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {children}
        </div>
      </div>
    </dialog>,
    document.body
  );
};
