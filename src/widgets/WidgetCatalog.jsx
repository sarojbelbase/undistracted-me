import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { XLg } from 'react-bootstrap-icons';
import { WIDGET_REGISTRY } from './index';
import { exportSettings, importFromFile, resetSettings } from './settingsIO';

const CATEGORIES = [
  { id: 'time', label: 'Time & Date', emoji: '🕐' },
  { id: 'planning', label: 'Planning', emoji: '📋' },
  { id: 'info', label: 'Information', emoji: '💡' },
  { id: 'tools', label: 'Tools', emoji: '🔧' },
];

export const WidgetCatalog = ({ instances, onAddInstance, onRemoveInstance, onClose }) => {
  const [tab, setTab] = useState('widgets');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importError, setImportError] = useState(null);

  // Count of instances per type
  const countByType = (instances || []).reduce((acc, { type }) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const handleReset = () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
    } else {
      resetSettings();
    }
  };

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.45)' }}
        onMouseDown={onClose}
      />

      {/* Slide-in drawer */}
      <div
        className="fixed right-0 top-0 h-full z-[101] flex flex-col shadow-2xl animate-slide-in"
        style={{ width: 320, backgroundColor: 'var(--w-surface)', borderLeft: '1px solid var(--w-border)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--w-border)' }}
        >
          <div className="flex gap-1">
            {['widgets', 'settings'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="px-3 py-1 rounded-lg text-sm font-medium capitalize transition-colors"
                style={{
                  backgroundColor: tab === t ? 'var(--w-accent)' : 'transparent',
                  color: tab === t ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                }}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:opacity-70 transition-opacity"
            style={{ color: 'var(--w-ink-4)' }}
          >
            <XLg size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto no-scrollbar p-5 flex flex-col gap-5">

          {tab === 'widgets' && (
            <>
              {/* Active instances */}
              {(instances || []).length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--w-ink-4)' }}>
                    Active · {instances.length}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {(instances || []).map(({ id, type }) => {
                      const reg = WIDGET_REGISTRY.find(w => w.type === type);
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between px-3 py-2 rounded-xl"
                          style={{ backgroundColor: 'var(--w-surface-2)' }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{reg?.icon ?? '▪'}</span>
                            <span className="text-sm truncate" style={{ color: 'var(--w-ink-1)' }}>
                              {reg?.label ?? type}
                            </span>
                          </div>
                          <button
                            onClick={() => onRemoveInstance(id)}
                            className="ml-2 shrink-0 text-xs px-2 py-0.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-colors"
                            style={{ color: 'var(--w-ink-4)' }}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--w-border)' }} />
                <span className="text-[11px] uppercase tracking-widest" style={{ color: 'var(--w-ink-5)' }}>Add More</span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'var(--w-border)' }} />
              </div>

              {/* Browse by category */}
              {CATEGORIES.map(cat => {
                const widgets = WIDGET_REGISTRY.filter(w => w.category === cat.id);
                if (!widgets.length) return null;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-base">{cat.emoji}</span>
                      <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: 'var(--w-ink-4)' }}>
                        {cat.label}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {widgets.map(w => (
                        <div
                          key={w.type}
                          className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                          style={{ backgroundColor: 'var(--w-surface-2)' }}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-base shrink-0">{w.icon}</span>
                            <div className="min-w-0">
                              <div className="text-sm font-medium" style={{ color: 'var(--w-ink-1)' }}>{w.label}</div>
                              {w.description && (
                                <div className="text-xs" style={{ color: 'var(--w-ink-5)' }}>{w.description}</div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 shrink-0">
                            {countByType[w.type] > 0 && (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
                              >
                                {countByType[w.type]}
                              </span>
                            )}
                            <button
                              onClick={() => onAddInstance(w.type)}
                              className="text-xs px-2 py-0.5 rounded-md font-medium transition-colors"
                              style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {tab === 'settings' && (
            <>
              {/* Persist settings */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: 'var(--w-surface-2)' }}
              >
                <div className="text-sm font-semibold" style={{ color: 'var(--w-ink-1)' }}>Persist Settings</div>
                <div className="text-xs" style={{ color: 'var(--w-ink-4)' }}>
                  Export your widget layout and settings as a JSON backup file.
                </div>
                <button
                  onClick={exportSettings}
                  className="text-sm px-3 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
                >
                  Export backup
                </button>
                <button
                  onClick={() => importFromFile(err => setImportError(String(err)))}
                  className="text-sm px-3 py-2 rounded-lg font-medium transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)', color: 'var(--w-ink-2)' }}
                >
                  Import from file
                </button>
                {importError && (
                  <div className="text-xs text-red-400">{importError}</div>
                )}
              </div>

              {/* Reset */}
              <div
                className="rounded-xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: 'var(--w-surface-2)' }}
              >
                <div className="text-sm font-semibold" style={{ color: 'var(--w-ink-1)' }}>Reset</div>
                <div className="text-xs" style={{ color: 'var(--w-ink-4)' }}>
                  Clear all settings and restore defaults. This cannot be undone.
                </div>
                <button
                  onClick={handleReset}
                  className="text-sm px-3 py-2 rounded-lg font-medium transition-all"
                  style={{
                    backgroundColor: resetConfirm ? '#ef4444' : 'var(--w-surface)',
                    border: '1px solid var(--w-border)',
                    color: resetConfirm ? '#fff' : 'var(--w-ink-2)',
                  }}
                >
                  {resetConfirm ? 'Tap again to confirm reset' : 'Reset all settings'}
                </button>
              </div>

              {/* Support */}
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ backgroundColor: 'var(--w-surface-2)' }}
              >
                <div className="text-sm font-semibold" style={{ color: 'var(--w-ink-1)' }}>Support</div>
                <a
                  href="https://buymemomo.com/sarojbelbase"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm px-3 py-2 rounded-lg font-medium text-center transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)', display: 'block' }}
                >
                  Buy me a momo 🥟
                </a>
                <a
                  href="https://github.com/sarojbelbase/undistracted-me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-center mt-1 hover:underline"
                  style={{ color: 'var(--w-ink-4)' }}
                >
                  GitHub
                </a>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-5 py-3 text-xs text-center shrink-0"
          style={{ borderTop: '1px solid var(--w-border)', color: 'var(--w-ink-5)' }}
        >
          Drag widgets on the grid to reorder them
        </div>
      </div>
    </>,
    document.body
  );
};
