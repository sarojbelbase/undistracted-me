import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg } from 'react-bootstrap-icons';
import { WIDGET_REGISTRY } from './index';
import { exportSettings, importFromFile, resetSettings } from './settingsIO';

const CATEGORIES = [
  { id: 'time', label: 'Time & Date' },
  { id: 'planning', label: 'Planning' },
  { id: 'info', label: 'Information' },
  { id: 'tools', label: 'Tools' },
];

export const WidgetCatalog = ({ instances, onAddInstance, onRemoveInstance, onClose }) => {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importError, setImportError] = useState(null);

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

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const activeCount = (instances || []).length;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(6px)' }}
        onMouseDown={onClose}
      />

      {/* Centered floating panel */}
      <div
        className="fixed z-[101] flex flex-col animate-panel-in"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 460,
          maxHeight: '78vh',
          backgroundColor: 'var(--w-surface)',
          border: '1px solid var(--w-border)',
          borderRadius: 22,
          boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-semibold" style={{ color: 'var(--w-ink-1)' }}>
              Widgets
            </span>
            {activeCount > 0 && (
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
              >
                {activeCount} on canvas
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-60"
            style={{ background: 'var(--w-surface-2)', color: 'var(--w-ink-4)' }}
          >
            <XLg size={11} />
          </button>
        </div>

        {/* Scrollable section */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4 flex flex-col gap-5">
          {CATEGORIES.map((cat) => {
            const widgets = WIDGET_REGISTRY.filter(w => w.category === cat.id);
            if (!widgets.length) return null;
            return (
              <div key={cat.id}>
                {/* Category label */}
                <div
                  className="text-[9px] font-bold uppercase tracking-[0.14em] mb-2.5"
                  style={{ color: 'var(--w-ink-5)' }}
                >
                  {cat.label}
                </div>

                {/* Widget grid — 4 cols */}
                <div className="grid grid-cols-4 gap-2">
                  {widgets.map(w => {
                    const isActive = !!countByType[w.type];
                    const count = countByType[w.type] || 0;

                    const handleAdd = (e) => {
                      e.stopPropagation();
                      onAddInstance(w.type);
                    };

                    const handleRemoveOne = (e) => {
                      e.stopPropagation();
                      const last = [...(instances || [])].reverse().find(i => i.type === w.type);
                      if (last) onRemoveInstance(last.id);
                    };

                    return (
                      <div
                        key={w.type}
                        className="relative flex flex-col items-center rounded-2xl transition-all duration-200"
                        style={{
                          background: isActive
                            ? `rgba(var(--w-accent-rgb), 0.08)`
                            : 'var(--w-surface-2)',
                          border: `1.5px solid ${isActive ? 'var(--w-accent)' : 'var(--w-border)'}`,
                          boxShadow: isActive
                            ? `0 0 0 3px rgba(var(--w-accent-rgb), 0.1)`
                            : 'none',
                        }}
                        title={w.description}
                      >
                        {/* Tap area — adds first instance if inactive */}
                        <button
                          className="w-full flex flex-col items-center justify-center pt-3.5 pb-2 gap-1.5 focus:outline-none"
                          onClick={isActive ? undefined : () => onAddInstance(w.type)}
                          style={{ cursor: isActive ? 'default' : 'pointer' }}
                        >
                          <span className="text-[22px] leading-none select-none">{w.icon}</span>
                          <span
                            className="text-[10px] font-medium text-center leading-tight px-1 w-full truncate"
                            style={{ color: isActive ? 'var(--w-ink-2)' : 'var(--w-ink-5)' }}
                          >
                            {w.label}
                          </span>
                        </button>

                        {/* Morphed stepper — only when active */}
                        {isActive ? (
                          <div className="w-full flex items-center justify-between px-2 pb-2.5 gap-1">
                            <button
                              onClick={handleRemoveOne}
                              className="flex-1 h-6 rounded-lg flex items-center justify-center text-sm font-bold transition-opacity hover:opacity-60 focus:outline-none select-none"
                              style={{ background: `rgba(var(--w-accent-rgb), 0.14)`, color: 'var(--w-accent)' }}
                            >
                              −
                            </button>
                            <span
                              className="text-[11px] font-bold tabular-nums w-4 text-center shrink-0"
                              style={{ color: 'var(--w-accent)' }}
                            >
                              {count}
                            </span>
                            <button
                              onClick={handleAdd}
                              className="flex-1 h-6 rounded-lg flex items-center justify-center text-sm font-bold transition-opacity hover:opacity-80 focus:outline-none select-none"
                              style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <div className="pb-1" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--w-border)' }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={exportSettings}
              className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--w-ink-4)', background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
            >
              Export
            </button>
            <button
              onClick={() => importFromFile(err => setImportError(String(err)))}
              className="text-[11px] px-2.5 py-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--w-ink-4)', background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}
            >
              Import
            </button>
            <button
              onClick={handleReset}
              className="text-[11px] px-2.5 py-1.5 rounded-lg transition-all"
              style={{
                color: resetConfirm ? '#ef4444' : 'var(--w-ink-5)',
                background: resetConfirm ? 'rgba(239,68,68,0.08)' : 'transparent',
                border: `1px solid ${resetConfirm ? 'rgba(239,68,68,0.3)' : 'transparent'}`,
              }}
            >
              {resetConfirm ? 'Confirm reset' : 'Reset'}
            </button>
          </div>

          <a
            href="https://buymemomo.com/sarojbelbase"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] transition-opacity hover:opacity-70"
            style={{ color: 'var(--w-ink-5)' }}
          >
            🥟 Momo
          </a>
        </div>

        {importError && (
          <div className="px-5 pb-3 text-xs" style={{ color: '#f87171' }}>{importError}</div>
        )}
      </div>
    </>,
    document.body
  );
};

