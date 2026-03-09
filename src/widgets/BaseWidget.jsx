import React, { useState, useRef, useEffect } from 'react';

/**
 * Base card wrapper for all widgets.
 *
 * Props:
 *  - settingsContent: JSX rendered inside the settings panel. When provided,
 *    a gear icon appears (hidden in edit mode). Clicking it opens the panel.
 *    Clicking outside closes it.
 */
export const BaseWidget = ({
  children,
  className = '',
  onRemove = null,
  showRemove = false,
  settingsContent = null,
}) => {
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
    <div className="relative h-full group">
      <div className={`bg-white rounded-2xl shadow-md text-gray-900 flex flex-col overflow-hidden h-full ${className}`}>
        {showRemove && onRemove && (
          <button
            onClick={onRemove}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white transition-colors z-10 text-sm leading-none"
            title="Remove widget"
          >
            ×
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
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          {showSettings && (
            <div ref={panelRef} className="absolute right-0 top-9 z-40 bg-white border border-gray-200 rounded-xl shadow-lg p-3 min-w-[150px] animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 tracking-wide">Settings</span>
                <button
                  onClick={() => setShowSettings(false)}
                  onMouseDown={e => e.stopPropagation()}
                  className="w-5 h-5 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              {settingsContent}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
