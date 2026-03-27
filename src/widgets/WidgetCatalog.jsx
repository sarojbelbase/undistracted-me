import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  XLg, GripVertical, PlusLg, DashLg,
  BoxArrowUpRight, Upload, Download, ArrowCounterclockwise,
  ClockFill, CalendarDateFill, BarChartFill, HourglassSplit,
  CalendarEventFill, Calendar3, StopwatchFill, StickyFill,
  CloudSunFill, LightbulbFill, BookmarkStarFill, MusicNoteBeamed,
  GraphUpArrow,
} from 'react-bootstrap-icons';
import { WIDGET_REGISTRY } from './index';
import { exportSettings, importFromFile, resetSettings } from './settingsIO';

// ─── Static icon map — avoids dynamic import() in hot path ────────────────────
const ICON_MAP = {
  ClockFill, CalendarDateFill, BarChartFill, HourglassSplit,
  CalendarEventFill, Calendar3, StopwatchFill, StickyFill,
  CloudSunFill, LightbulbFill, BookmarkStarFill, MusicNoteBeamed,
  GraphUpArrow,
};

const WidgetIcon = ({ name, size = 14 }) => {
  const Icon = ICON_MAP[name];
  return Icon ? <Icon size={size} /> : null;
};

// ─── Category config ───────────────────────────────────────────────────────────
const TABS = [
  { id: 'all', label: 'All' },
  { id: 'time', label: 'Time' },
  { id: 'planning', label: 'Planning' },
  { id: 'info', label: 'Info' },
  { id: 'tools', label: 'Tools' },
];

const CATEGORY_LABELS = {
  time: 'Time & Date',
  planning: 'Planning',
  info: 'Information',
  tools: 'Tools',
};
const CATEGORY_ORDER = ['time', 'planning', 'info', 'tools'];

// ─── Individual widget row ─────────────────────────────────────────────────────
const WidgetRow = ({ widget, count, onAdd, onRemove }) => {
  const isActive = count > 0;
  return (
    <div className={`wc-row${isActive ? ' wc-row--active' : ''}`} role="listitem">
      <span className="wc-grip" aria-hidden="true">
        <GripVertical size={12} />
      </span>

      <span className={`wc-icon-box${isActive ? ' wc-icon-box--active' : ''}`}>
        <WidgetIcon name={widget.icon} size={16} />
      </span>

      <div className="wc-text" onClick={onAdd} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onAdd()}>
        <span className="wc-label">{widget.label}</span>
        <span className="wc-desc">{widget.description}</span>
      </div>

      <div className="wc-row-controls">
        {count > 1 && <span className="wc-multi-badge">×{count}</span>}
        {isActive && (
          <button className="wc-icon-btn wc-icon-btn--remove"
            onClick={e => { e.stopPropagation(); onRemove(); }}
            aria-label={`Remove ${widget.label}`}
            title="Remove one">
            <DashLg size={10} />
          </button>
        )}
        <button className="wc-icon-btn wc-icon-btn--add"
          onClick={onAdd}
          aria-label={`Add ${widget.label}`}
          title="Add to canvas">
          <PlusLg size={10} />
        </button>
      </div>
    </div>
  );
};

// ─── Main catalog ──────────────────────────────────────────────────────────────
export const WidgetCatalog = ({ instances, onAddInstance, onRemoveInstance, onClose }) => {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [importError, setImportError] = useState(null);
  const [importOk, setImportOk] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [visible, setVisible] = useState(false);

  // Entrance: single animation frame before setting visible=true triggers CSS transition
  useEffect(() => { const id = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(id); }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    setTimeout(onClose, 240);
  }, [onClose]);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [handleClose]);

  const countByType = (instances || []).reduce((acc, { type }) => {
    acc[type] = (acc[type] || 0) + 1; return acc;
  }, {});

  const removeLastOfType = (type) => {
    const last = [...(instances || [])].reverse().find(i => i.type === type);
    if (last) onRemoveInstance(last.id);
  };

  const handleReset = () => {
    if (!resetConfirm) { setResetConfirm(true); setTimeout(() => setResetConfirm(false), 4000); }
    else resetSettings();
  };

  const handleImport = () => {
    importFromFile((err) => {
      if (err) { setImportError(String(err)); setTimeout(() => setImportError(null), 3500); }
      else { setImportOk(true); setTimeout(() => setImportOk(false), 2000); }
    });
  };

  const filteredWidgets = activeTab === 'all'
    ? WIDGET_REGISTRY
    : WIDGET_REGISTRY.filter(w => w.category === activeTab);

  const activeCount = Object.values(countByType).reduce((s, n) => s + n, 0);

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className="wc-backdrop"
        style={{ opacity: visible ? 1 : 0 }}
        onMouseDown={handleClose}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <aside
        className="wc-panel"
        style={{ transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 20px))', opacity: visible ? 1 : 0 }}
        onMouseDown={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Widget catalog"
      >
        {/* ── Header ── */}
        <div className="wc-header">
          <div className="wc-header-left">
            <span className="wc-title">Widgets</span>
            {activeCount > 0 && <span className="wc-active-badge">{activeCount}</span>}
          </div>

          <div className="wc-header-right">
            <button className="wc-pill-btn" onClick={exportSettings} title="Export settings">
              <Upload size={11} /><span>Export</span>
            </button>
            <button className="wc-pill-btn" onClick={handleImport} title="Import settings">
              <Download size={11} /><span>{importOk ? 'Done!' : 'Import'}</span>
            </button>
            <button
              className={`wc-pill-btn${resetConfirm ? ' wc-pill-btn--danger' : ''}`}
              onClick={handleReset}
              title={resetConfirm ? 'Click again to confirm reset' : 'Reset all settings'}
            >
              <ArrowCounterclockwise size={11} />
              <span>{resetConfirm ? 'Sure?' : 'Reset'}</span>
            </button>

            <span className="wc-header-sep" aria-hidden="true" />

            <button className="wc-close-btn" onClick={handleClose} aria-label="Close (Esc)">
              <XLg size={11} />
            </button>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <nav className="wc-tabs" role="tablist" aria-label="Widget categories">
          {TABS.map(tab => {
            const cnt = tab.id === 'all'
              ? WIDGET_REGISTRY.length
              : WIDGET_REGISTRY.filter(w => w.category === tab.id).length;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`wc-tab${activeTab === tab.id ? ' wc-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span className="wc-tab-cnt">{cnt}</span>
              </button>
            );
          })}
        </nav>

        {/* ── Widget list ── */}
        <div className="wc-list" role="list">
          {activeTab === 'all'
            ? CATEGORY_ORDER.map(cat => {
              const widgets = WIDGET_REGISTRY.filter(w => w.category === cat);
              return (
                <React.Fragment key={cat}>
                  <div className="wc-section-header" role="presentation">
                    {CATEGORY_LABELS[cat]}
                    <span className="wc-section-count">{widgets.length}</span>
                  </div>
                  {widgets.map(w => (
                    <WidgetRow
                      key={w.type}
                      widget={w}
                      count={countByType[w.type] || 0}
                      onAdd={() => onAddInstance(w.type)}
                      onRemove={() => removeLastOfType(w.type)}
                    />
                  ))}
                </React.Fragment>
              );
            })
            : filteredWidgets.map(w => (
              <WidgetRow
                key={w.type}
                widget={w}
                count={countByType[w.type] || 0}
                onAdd={() => onAddInstance(w.type)}
                onRemove={() => removeLastOfType(w.type)}
              />
            ))
          }
        </div>

        {/* ── Footer ── */}
        <div className="wc-footer">
          {importError
            ? <span className="wc-footer-err">{importError}</span>
            : <span className="wc-footer-hint">+ add &nbsp;·&nbsp; − remove from canvas</span>
          }
          <a
            href="https://buymemomo.com/sarojbelbase"
            target="_blank"
            rel="noopener noreferrer"
            className="wc-momo-link"
          >
            <BoxArrowUpRight size={9} /><span>Buy Momo</span>
          </a>
        </div>
      </aside>
    </>,
    document.body
  );
};

