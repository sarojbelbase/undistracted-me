import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TooltipBtn } from '../components/ui/TooltipBtn';
import { Popup } from '../components/ui/Popup';
import { createPortal } from 'react-dom';
import {
  XLg, PlusLg, DashLg,
  BoxArrowUpRight,
  InfoCircleFill, GearFill, ClockFill, CalendarEventFill,
} from 'react-bootstrap-icons';
import { WIDGET_REGISTRY } from './index';
import { CURRENT_PLATFORM } from '../constants/env';

/** Returns 'full' | 'partial' | 'none' for the widget on the current platform. */
const getPlatformSupport = (widget) => {
  const p = widget.platforms?.[CURRENT_PLATFORM];
  if (!p) return 'full'; // no platforms key = fully supported everywhere
  if (p.supported === false) return 'none';
  if (p.supported === 'partial') return 'partial';
  return 'full';
};

const getLimitations = (widget) =>
  widget.platforms?.[CURRENT_PLATFORM]?.limitations ?? [];

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
const WidgetRow = ({ widget, count, onAdd, onRemove, support, limitations }) => {
  const isActive = count > 0 && support !== 'none';
  const disabled = support === 'none';
  const partial = support === 'partial';
  const Icon = widget.icon;

  const descText = disabled
    ? 'Extension only — not available here'
    : widget.description;

  const [iconAnchor, setIconAnchor] = useState(null);
  const iconRef = useRef(null);

  let tooltipContent = null;
  if (disabled || partial) {
    if (widget.platforms) {
      tooltipContent = [];
      const order = ['extension', 'web', 'phone'];
      const platforms = Object.keys(widget.platforms).sort((a, b) => order.indexOf(a) - order.indexOf(b));

      platforms.forEach(plat => {
        const p = widget.platforms[plat];
        const name = plat.charAt(0).toUpperCase() + plat.slice(1);

        if (p.supported === true) {
          tooltipContent.push(`✅ ${name}: Supported`);
        } else if (p.supported === false) {
          tooltipContent.push(`❌ ${name}: Not supported`);
        } else if (p.supported === 'partial') {
          tooltipContent.push(`⚠️ ${name}: Partial support`);
          if (p.limitations?.length) {
            p.limitations.forEach(l => tooltipContent.push(`    • ${l}`));
          }
        }
      });
    } else {
      tooltipContent = ['Not supported on this platform'];
    }
  }

  return (
    <li className={[
      'wc-row',
      isActive ? 'wc-row--active' : '',
      disabled ? 'wc-row--disabled' : '',
    ].filter(Boolean).join(' ')}>

      <span
        ref={iconRef}
        onMouseEnter={(e) => setIconAnchor(iconRef.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setIconAnchor(null)}
        className={[
          'wc-icon-box',
          isActive ? 'wc-icon-box--active' : '',
          partial ? 'wc-icon-box--partial' : ''
        ].filter(Boolean).join(' ')}
      >
        {Icon ? <Icon size={17} /> : null}
      </span>
      {tooltipContent && iconAnchor && (
        <Popup anchor={iconAnchor} preferAbove className="px-2.5 py-1.5">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tooltipContent.map((line, i) => (
              <span key={i} style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {line}
              </span>
            ))}
          </div>
        </Popup>
      )}

      <div className="wc-text">
        <span className="wc-label">{widget.title}</span>
        <span className="wc-desc">{descText}</span>
      </div>

      {/* Stepper: [−] count [+] */}
      <div className="wc-stepper">
        <TooltipBtn
          className="wc-stepper-btn wc-stepper-btn--remove"
          onClick={e => { e.stopPropagation(); if (!disabled) onRemove(); }}
          disabled={disabled}
          tooltip={disabled ? 'Cannot remove (disabled)' : 'Remove one'}
          style={{ visibility: (isActive || disabled) ? 'visible' : 'hidden' }}
        >
          <DashLg size={12} />
        </TooltipBtn>

        <span className="wc-stepper-count" style={{ opacity: disabled ? 0.4 : 1, visibility: (isActive || disabled) ? 'visible' : 'hidden' }}>{count}</span>

        <TooltipBtn
          className={`wc-stepper-btn wc-stepper-btn--add${isActive ? ' wc-stepper-btn--add-active' : ''}`}
          onClick={e => { if (!disabled) onAdd(e); }}
          disabled={disabled}
          tooltip={disabled ? 'Not supported on this platform' : partial ? 'Add (limited support)' : 'Add to canvas'}
        >
          <PlusLg size={12} />
        </TooltipBtn>
      </div>
    </li>
  );
};

// ─── Main catalog ──────────────────────────────────────────────────────────────
export const WidgetCatalog = ({ instances, onAddInstance, onRemoveInstance, onClose }) => {
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
                  {catWidgets.map(w => {
                    const support = getPlatformSupport(w);
                    const limitations = getLimitations(w);
                    return (
                      <WidgetRow
                        key={w.type}
                        widget={w}
                        count={countByType[w.type] || 0}
                        onAdd={() => onAddInstance(w.type)}
                        onRemove={() => removeLastOfType(w.type)}
                        support={support}
                        limitations={limitations}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })
            : filteredWidgets.map(w => {
              const support = getPlatformSupport(w);
              const limitations = getLimitations(w);
              return (
                <WidgetRow
                  key={w.type}
                  widget={w}
                  count={countByType[w.type] || 0}
                  onAdd={() => onAddInstance(w.type)}
                  onRemove={() => removeLastOfType(w.type)}
                  support={support}
                  limitations={limitations}
                />
              );
            })
          }
        </ul>
        <div className="wc-footer">
          <span className="wc-footer-hint">+ Add &nbsp;·&nbsp; − Remove from Canvas</span>
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

