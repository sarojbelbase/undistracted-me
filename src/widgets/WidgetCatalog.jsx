import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg } from 'react-bootstrap-icons';
import { WIDGET_REGISTRY } from './index';
import { exportSettings, importFromFile, resetSettings } from './settingsIO';

const TABS = [
  { id: 'all', label: 'All' },
  { id: 'time', label: 'Time & Date' },
  { id: 'planning', label: 'Planning' },
  { id: 'info', label: 'Information' },
  { id: 'tools', label: 'Tools' },
];

export const WidgetCatalog = ({ instances, onAddInstance, onRemoveInstance, onClose }) => {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importError, setImportError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const countByType = (instances || []).reduce((acc, { type }) => {
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const removeLastOfType = (type) => {
    const last = [...(instances || [])].reverse().find(i => i.type === type);
    if (last) onRemoveInstance(last.id);
  };

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

  const activeTypes = Object.keys(countByType);
  const filteredWidgets = activeTab === 'all'
    ? WIDGET_REGISTRY
    : WIDGET_REGISTRY.filter(w => w.category === activeTab);

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(6px)' }}
        onMouseDown={onClose}
      />

      {/* Panel */}
      <div
        className="fixed z-[101] flex flex-col animate-panel-in"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 520,
          maxHeight: '82vh',
          backgroundColor: 'var(--w-surface)',
          border: '1px solid var(--w-border)',
          borderRadius: 22,
          boxShadow: '0 32px 80px rgba(0,0,0,0.28), 0 8px 24px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--w-border)' }}
        >
          <span className="text-sm font-semibold flex-1" style={{ color: 'var(--w-ink-1)' }}>
            Customize Canvas
          </span>

          {/* Utility pills */}
          <div className="flex items-center gap-1">
            {[
              { label: 'Export', onClick: exportSettings },
              { label: 'Import', onClick: () => importFromFile(err => setImportError(String(err))) },
              {
                label: resetConfirm ? 'Confirm' : 'Reset',
                onClick: handleReset,
                danger: resetConfirm,
              },
            ].map(({ label, onClick, danger }) => (
              <button
                key={label}
                onClick={onClick}
                className="text-[10px] font-medium px-2 py-1 rounded-lg transition-colors cursor-pointer"
                style={{
                  color: danger ? '#ef4444' : 'var(--w-ink-5)',
                  background: danger ? 'rgba(239,68,68,0.08)' : 'var(--w-surface-2)',
                  border: `1px solid ${danger ? 'rgba(239,68,68,0.3)' : 'var(--w-border)'}`,
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-opacity hover:opacity-60 cursor-pointer"
            style={{ background: 'var(--w-surface-2)', color: 'var(--w-ink-4)' }}
          >
            <XLg size={11} />
          </button>
        </div>

        {/* ── Active chips strip ── */}
        {activeTypes.length > 0 && (
          <div
            className="px-5 py-3 shrink-0 flex items-start gap-3"
            style={{ borderBottom: '1px solid var(--w-border)' }}
          >
            <span
              className="text-[9px] font-bold uppercase tracking-[0.14em] mt-1 shrink-0"
              style={{ color: 'var(--w-ink-5)' }}
            >
              On Canvas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {activeTypes.map(type => {
                const w = WIDGET_REGISTRY.find(r => r.type === type);
                if (!w) return null;
                const count = countByType[type];
                return (
                  <div
                    key={type}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                    style={{
                      background: `rgba(var(--w-accent-rgb), 0.09)`,
                      border: '1px solid var(--w-accent)',
                    }}
                  >
                    <span style={{ fontSize: 12 }}>{w.icon}</span>
                    <span className="text-[10px] font-medium" style={{ color: 'var(--w-ink-2)' }}>
                      {w.label}
                      {count > 1 && (
                        <span className="ml-1 text-[9px]" style={{ color: 'var(--w-accent)' }}>
                          ×{count}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => removeLastOfType(type)}
                      className="flex items-center justify-center rounded-full transition-opacity hover:opacity-60 cursor-pointer"
                      style={{ width: 13, height: 13, background: 'var(--w-accent)', color: '#fff', flexShrink: 0 }}
                      title={`Remove ${w.label}`}
                    >
                      <svg width="6" height="6" viewBox="0 0 6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="5" y2="5" /><line x1="5" y1="1" x2="1" y2="5" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Scrollable area ── */}
        <div className="flex-1 overflow-y-auto no-scrollbar flex flex-col">

          {/* Sticky category tabs */}
          <div
            className="flex items-center gap-1 px-5 py-3 shrink-0 overflow-x-auto no-scrollbar"
            style={{
              position: 'sticky',
              top: 0,
              backgroundColor: 'var(--w-surface)',
              zIndex: 2,
              borderBottom: '1px solid var(--w-border)',
            }}
          >
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    background: isActive ? 'var(--w-accent)' : 'var(--w-surface-2)',
                    color: isActive ? '#fff' : 'var(--w-ink-4)',
                    border: isActive ? '1px solid transparent' : '1px solid var(--w-border)',
                    letterSpacing: '0.01em',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Widget grid — 3 columns */}
          <div className="grid grid-cols-3 gap-2.5 p-5">
            {filteredWidgets.map(w => {
              const count = countByType[w.type] || 0;
              const isActive = count > 0;

              return (
                <div
                  key={w.type}
                  className="relative flex flex-col rounded-2xl overflow-hidden group"
                  style={{
                    background: isActive
                      ? `rgba(var(--w-accent-rgb), 0.06)`
                      : 'var(--w-surface-2)',
                    border: `1.5px solid ${isActive ? 'var(--w-accent)' : 'var(--w-border)'}`,
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  title={w.description}
                >
                  {/* Count badge */}
                  {count > 0 && (
                    <div
                      className="absolute top-2 right-2 z-10 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums"
                      style={{ background: 'var(--w-accent)', color: '#fff' }}
                    >
                      {count}
                    </div>
                  )}

                  {/* Card body — click adds */}
                  <button
                    className="flex flex-col items-center justify-center gap-1.5 pt-5 pb-3 w-full focus:outline-none cursor-pointer"
                    onClick={() => onAddInstance(w.type)}
                  >
                    <span
                      className="text-[26px] leading-none select-none transition-transform duration-200 group-hover:scale-110"
                    >
                      {w.icon}
                    </span>
                    <span
                      className="text-[10px] font-medium text-center leading-tight px-2 w-full truncate"
                      style={{ color: isActive ? 'var(--w-ink-2)' : 'var(--w-ink-5)' }}
                    >
                      {w.label}
                    </span>
                  </button>

                  {/* Remove strip — only when active */}
                  {isActive && (
                    <button
                      className="w-full text-[9px] font-semibold py-1.5 transition-opacity hover:opacity-70 cursor-pointer shrink-0"
                      style={{
                        borderTop: `1px solid var(--w-accent)`,
                        background: `rgba(var(--w-accent-rgb), 0.08)`,
                        color: 'var(--w-accent)',
                        letterSpacing: '0.04em',
                      }}
                      onClick={(e) => { e.stopPropagation(); removeLastOfType(w.type); }}
                    >
                      − Remove
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="shrink-0 flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid var(--w-border)' }}
        >
          {importError ? (
            <span className="text-[11px]" style={{ color: '#f87171' }}>{importError}</span>
          ) : (
            <span />
          )}
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
      </div>
    </>,
    document.body
  );
};

