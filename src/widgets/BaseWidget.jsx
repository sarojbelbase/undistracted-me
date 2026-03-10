import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { GearWide, XLg } from 'react-bootstrap-icons';

/**
 * Base card wrapper for all widgets.
 *
 * Props:
 *  - settingsContent: JSX rendered inside the settings panel. When provided,
 *    a gear icon appears (hidden in edit mode). Clicking it opens the panel.
 *    Clicking outside closes it.
 *  - ref: forwarded to the outer wrapper div (for ResizeObserver / sizing).
 */
export const BaseWidget = forwardRef(({
  children,
  className = '',
  onRemove = null,
  showRemove = false,
  settingsContent = null,
}, ref) => {
  const [showSettings, setShowSettings] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  return (
    // Outer div is overflow-visible so the settings panel can escape the card boundary
    <div ref={ref} className="relative h-full group">
      <div className={`bg-white rounded-2xl shadow-md text-gray-900 flex flex-col overflow-hidden h-full ${className}`}>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10"
            title="Remove widget"
          >
            <XLg size={10} />
          </button>
        )}
        {children}
      </div>

      {/* Settings gear — hidden in edit mode so it doesn't conflict with the remove button */}
      {settingsContent && !showRemove && (
        <div className="absolute top-2 right-2 z-20">
          <button
            onClick={() => setShowSettings(s => !s)}
            onMouseDown={e => e.stopPropagation()}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-700 transition-all opacity-0 group-hover:opacity-100"
            title="Widget settings"
          >
            <GearWide size={13} />
          </button>

          {showSettings && (
            <div ref={panelRef} className="absolute right-0 top-9 z-40 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[150px] animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="w-label">Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  onMouseDown={e => e.stopPropagation()}
                  className="w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <XLg size={10} />
                </button>
              </div>
              {settingsContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

BaseWidget.displayName = 'BaseWidget';
