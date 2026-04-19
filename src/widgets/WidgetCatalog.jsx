import React, { useState, useEffect, useCallback } from 'react';
import { ConfirmButton } from '../components/ui/ConfirmButton';
import { TooltipBtn } from '../components/ui/TooltipBtn';
import { createPortal } from 'react-dom';
import {
  XLg, PlusLg, DashLg,
  BoxArrowUpRight, Upload, Download, ArrowCounterclockwise,
  InfoCircleFill, GearFill, ClockFill, CalendarEventFill,
} from 'react-bootstrap-icons';
import { WIDGET_REGISTRY } from './index';
import { exportSettings, importFromFile, resetSettings } from './settingsIO';


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
const CATEGORY_ICONS = {
  time: <ClockFill size={11} />,
  planning: <CalendarEventFill size={11} />,
  info: <InfoCircleFill size={11} />,
  tools: <GearFill size={11} />,
};
const CATEGORY_ORDER = ['time', 'planning', 'info', 'tools'];

// ─── Individual widget row ─────────────────────────────────────────────────────
const WidgetRow = ({ widget, count, onAdd, onRemove }) => {
  const isActive = count > 0;
  const Icon = widget.icon;
  return (
    <li className={`wc-row${isActive ? ' wc-row--active' : ''}`}>

      <span className={`wc-icon-box${isActive ? ' wc-icon-box--active' : ''}`}>
        {Icon ? <Icon size={17} /> : null}
      </span>

      <div className="wc-text">
        <span className="wc-label">{widget.title}</span>
        <span className="wc-desc">{widget.description}</span>
      </div>

      {/* Always-visible stepper: [−] count [+] */}
      <div className="wc-stepper">
        {isActive ? (
          <>
            <TooltipBtn
              className="wc-stepper-btn wc-stepper-btn--remove"
              onClick={e => { e.stopPropagation(); onRemove(); }}
              aria-label={`Remove ${widget.title}`}
              tooltip="Remove one"
            >
              <DashLg size={12} />
            </TooltipBtn>
            <span className="wc-stepper-count">{count}</span>
          </>
        ) : null}
        <TooltipBtn
          className={`wc-stepper-btn wc-stepper-btn--add${isActive ? ' wc-stepper-btn--add-active' : ''}`}
          onClick={onAdd}
          aria-label={`Add ${widget.title}`}
          tooltip="Add to canvas"
        >
          <PlusLg size={12} />
        </TooltipBtn>
      </div>
    </li>
  );
};

// ─── Main catalog ──────────────────────────────────────────────────────────────
export const WidgetCatalog = ({ instances, onAddInstance, onRemoveInstance, onClose }) => {
  const [importError, setImportError] = useState(null);
  const [importOk, setImportOk] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [phase, setPhase] = useState('entering'); // entering → open → leaving

  // Double-RAF: first frame mounts the DOM at initial state (translateX 100%),
  // second frame flips to open so the browser has a real "from" state to transition from.
  useEffect(() => {
    let id1, id2;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => setPhase('open'));
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, []);

  const handleClose = useCallback(() => {
    setPhase('leaving');
    setTimeout(onClose, 280);
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

  const handleImport = () => {
    importFromFile((err) => {
      if (err) { setImportError(String(err)); setTimeout(() => setImportError(null), 3500); }
      else { setImportOk(true); setTimeout(() => setImportOk(false), 2000); }
    });
  };

  const filteredWidgets = activeTab === 'all'
    ? WIDGET_REGISTRY
    : WIDGET_REGISTRY.filter(w => w.category === activeTab);

  return createPortal(
    <>
      {/* ── Backdrop ── */}
      <div
        className={`wc-backdrop${phase === 'leaving' ? ' wc-backdrop--leaving' : ''}`}
        style={{ opacity: phase === 'open' ? 1 : 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />

      {/* ── Drawer panel ── */}
      <dialog
        open
        className={`wc-panel${phase === 'leaving' ? ' wc-panel--leaving' : ''}`}
        style={{ transform: phase === 'open' ? 'translateX(0)' : 'translateX(100%)' }}
        aria-modal="true"
        aria-label="Widget catalog"
      >
        {/* ── Header ── */}
        <div className="wc-header">
          <div className="wc-header-left">
            <span className="wc-title">Widgets</span>
          </div>

          <div className="wc-header-center">
            <TooltipBtn className="wc-pill-btn" onClick={exportSettings} tooltip="Export settings">
              <Upload size={11} /><span>Export</span>
            </TooltipBtn>
            <TooltipBtn className="wc-pill-btn" onClick={handleImport} tooltip="Import settings">
              <Download size={11} /><span>{importOk ? 'Done!' : 'Import'}</span>
            </TooltipBtn>
            <ConfirmButton
              onConfirm={resetSettings}
              label="Reset settings"
              className="wc-pill-btn"
              timeout={4000}
            >
              <ArrowCounterclockwise size={11} /><span>Reset</span>
            </ConfirmButton>
          </div>

          <div className="wc-header-right">
            <button className="wc-close-btn" onClick={handleClose} aria-label="Close (Esc)">
              <XLg size={11} />
            </button>
          </div>
        </div>

        {/* ── Category tabs ── */}
        <div role="tablist" className="wc-tabs" aria-label="Widget categories">
          {TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`wc-tab${activeTab === tab.id ? ' wc-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── Widget list ── */}
        <ul className="wc-list">
          {activeTab === 'all'
            ? CATEGORY_ORDER.map(cat => {
              const catWidgets = WIDGET_REGISTRY.filter(w => w.category === cat);
              return (
                <React.Fragment key={cat}>
                  <li className="wc-section-header" role="none">
                    <span className="wc-section-icon">{CATEGORY_ICONS[cat]}</span>
                    {CATEGORY_LABELS[cat]}
                  </li>
                  {catWidgets.map(w => (
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
        </ul>
        <div className="wc-footer">
          {importError
            ? <span className="wc-footer-err">{importError}</span>
            : <span className="wc-footer-hint">+ Add &nbsp;·&nbsp; − Remove from Canvas</span>
          }
          <a
            href="https://buymemomo.com/sarojbelbase"
            target="_blank"
            rel="noopener noreferrer"
            className="wc-momo-link"
          >
            <BoxArrowUpRight size={9} /><span>Buy Me Momo</span>
          </a>
        </div>
      </dialog>
    </>,
    document.body
  );
};

