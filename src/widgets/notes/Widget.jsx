import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Plus, DashLg } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Modal } from '../../components/ui/Modal';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { Popup } from '../../components/ui/Popup';
import { TooltipBtn } from '../../components/ui/TooltipBtn';

// Only fetched the first time a user opens a note in modal or full-page mode.
const LexicalEditor = lazy(() => import('./LexicalEditor'));

const PAD = 20;

const DASH_SEP = {
  backgroundImage: 'radial-gradient(circle, var(--w-ink-6) 1.5px, transparent 3px)',
  backgroundPosition: 'bottom center',
  backgroundSize: '9px 1.5px',
  backgroundRepeat: 'repeat-x',
};

// ─── Traffic lights (red | yellow | green — correct macOS order) ───────────────
const TrafficDot = ({ onClick, label, color, disabled, symbol }) => {
  const [hovered, setHovered] = useState(false);
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);

  const handleMouseEnter = () => {
    setHovered(true);
    setAnchor(btnRef.current?.getBoundingClientRect() ?? null);
  };
  const handleMouseLeave = () => {
    setHovered(false);
    setAnchor(null);
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={disabled ? undefined : onClick}
        onMouseDown={e => e.stopPropagation()}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-label={label}
        disabled={disabled}
        style={{
          width: 14, height: 14, border: 'none', padding: 0, flexShrink: 0,
          borderRadius: '50%',
          backgroundColor: disabled ? 'var(--w-border)' : color,
          cursor: disabled ? 'default' : 'pointer',
          transition: 'filter 0.12s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
          boxShadow: 'inset 0 0 0 0.5px rgba(0,0,0,0.18)',
        }}
      >
        {hovered && !disabled && (
          <span style={{
            fontSize: 9, fontWeight: 900, lineHeight: 1,
            color: 'rgba(0,0,0,0.55)',
            userSelect: 'none', pointerEvents: 'none',
            fontFamily: 'system-ui, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '100%', height: '100%',
            position: 'absolute', top: 0, left: 0,
          }}>
            {symbol}
          </span>
        )}
      </button>
      {label && anchor && hovered && !disabled && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>
            {label}
          </span>
        </Popup>
      )}
    </>
  );
};

const TrafficLights = ({
  onRed, onYellow, onGreen,
  redLabel, yellowLabel, greenLabel,
  redDisabled, yellowDisabled, greenDisabled,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <TrafficDot onClick={onRed} label={redLabel ?? 'Close'} color="#ff5f57" disabled={redDisabled} symbol="×" />
    <TrafficDot onClick={onYellow} label={yellowLabel ?? 'Minimize'} color="#ffbd2e" disabled={yellowDisabled} symbol="−" />
    <TrafficDot onClick={onGreen} label={greenLabel ?? 'Full Screen'} color="#28c840" disabled={greenDisabled} symbol="+" />
  </div>
);

// ─── Segmented-control button (with Popup tooltip) ────────────────────────────
const SegBtn = ({ onClick, disabled, label, children }) => (
  <TooltipBtn
    type="button"
    aria-label={label}
    onClick={disabled ? undefined : onClick}
    disabled={disabled}
    tooltip={disabled ? undefined : label}
    style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: 4, border: 'none', borderRadius: 6, padding: '2px 5px',
      fontSize: '0.6875rem', fontWeight: 600, lineHeight: 1,
      background: 'transparent',
      color: disabled ? 'var(--w-ink-6)' : 'var(--w-ink-3)',
      cursor: disabled ? 'default' : 'pointer',
      transition: 'background 0.12s, color 0.12s',
      minHeight: 22,
    }}
    onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'rgba(0,0,0,0.06)'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
  >
    {children}
  </TooltipBtn>
);

// ─── Circular icon button ─────────────────────────────────────────────────────
function circleBtnStyle(disabled, danger, size) {
  let bg = disabled ? 'rgba(0,0,0,0.03)' : 'rgba(0,0,0,0.06)';
  let color = disabled ? 'var(--w-ink-6)' : 'var(--w-ink-3)';
  if (danger) {
    bg = disabled ? 'transparent' : 'rgba(239,68,68,0.08)';
    color = disabled ? 'var(--w-ink-6)' : 'var(--w-danger)';
  }
  return {
    width: size, height: size, border: 'none', borderRadius: '50%', padding: 0,
    flexShrink: 0, background: bg, cursor: disabled ? 'default' : 'pointer',
    color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.12s, color 0.12s',
  };
}

const CircleBtn = ({ onClick, label, disabled, danger = false, size = 28, children }) => {
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <button
        ref={btnRef}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        aria-label={label}
        style={circleBtnStyle(disabled, danger, size)}
        onMouseEnter={() => { if (!disabled) setAnchor(btnRef.current?.getBoundingClientRect() ?? null); }}
        onMouseLeave={() => setAnchor(null)}
      >
        {children}
      </button>
      {label && anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>{label}</span>
        </Popup>
      )}
    </>
  );
};

// ─── Nav dot (pagination dot with Popup tooltip) ──────────────────────────────
const NavDot = ({ active, label, onClick }) => {
  const btnRef = useRef(null);
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <button
        ref={btnRef}
        onClick={onClick}
        aria-label={label}
        style={{
          width: active ? 14 : 5, height: 5,
          borderRadius: 99, border: 'none', padding: 0, cursor: 'pointer',
          background: active ? 'var(--w-accent)' : 'var(--w-ink-6)',
          opacity: active ? 1 : 0.4,
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={() => setAnchor(btnRef.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setAnchor(null)}
      />
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>{label}</span>
        </Popup>
      )}
    </>
  );
};

// ─── Split a note string into title (first line) and body (rest) ──────────────
function splitNote(text = '') {
  const t = text;
  const nl = t.indexOf('\n');
  if (nl === -1) return { titleLine: t, bodyText: '' };
  return { titleLine: t.slice(0, nl), bodyText: t.slice(nl + 1) };
}

// Merge title + body back into a single string (no trailing \n when body is empty)
function mergeNote(title, body) {
  if (!body) return title;
  return `${title}\n${body}`;
}

// ─── Migrate old { text } → { notes, idx } ────────────────────────────────────
function resolveSettings(raw) {
  if (Array.isArray(raw.notes)) return { notes: raw.notes, idx: raw.idx ?? 0 };
  return { notes: [raw.text ?? ''], idx: 0 };
}

// ─── Widget ───────────────────────────────────────────────────────────────────
export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { notes: [''], idx: 0 });
  const { notes: initNotes, idx: initIdx } = resolveSettings(settings);
  const [localNotes, setLocalNotes] = useState(initNotes);
  const [localIdx, setLocalIdx] = useState(initIdx);
  const saveTimerRef = useRef(null);

  const localText = localNotes[localIdx] ?? '';
  const total = localNotes.length;
  const { titleLine } = splitNote(localText);
  const wordCount = localText.trim() ? localText.trim().split(/\s+/).length : 0;

  // ── Change handlers ──────────────────────────────────────────────────────────
  const persist = useCallback((next) => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => updateSetting('notes', next), 600);
  }, [updateSetting]);

  const handleTitleChange = useCallback((e) => {
    const val = e.target.value.replaceAll('\n', '');
    setLocalNotes(prev => {
      const { bodyText: prevBody } = splitNote(prev[localIdx] ?? '');
      const newText = mergeNote(val, prevBody);
      const next = [...prev]; next[localIdx] = newText;
      persist(next); return next;
    });
  }, [localIdx, persist]);

  // Called by LexicalEditor whenever the body markdown changes
  const handleBodyChange = useCallback((md) => {
    setLocalNotes(prev => {
      const { titleLine: prevTitle } = splitNote(prev[localIdx] ?? '');
      const newText = mergeNote(prevTitle, md);
      const next = [...prev]; next[localIdx] = newText;
      persist(next); return next;
    });
  }, [localIdx, persist]);

  const { bodyText } = splitNote(localNotes[localIdx] ?? '');

  // ── Navigation ────────────────────────────────────────────────────────────────
  const jumpTo = useCallback((n) => {
    setLocalIdx(n); updateSetting('idx', n);
  }, [updateSetting]);

  const goPrev = useCallback(() => { if (localIdx > 0) jumpTo(localIdx - 1); }, [localIdx, jumpTo]);
  const goNext = useCallback(() => { if (localIdx < total - 1) jumpTo(localIdx + 1); }, [localIdx, total, jumpTo]);

  const addNote = useCallback(() => {
    const newNotes = [...localNotes, ''];
    const newIdx = newNotes.length - 1;
    setLocalNotes(newNotes); setLocalIdx(newIdx);
    updateSetting('notes', newNotes); updateSetting('idx', newIdx);
  }, [localNotes, updateSetting]);

  const deleteNote = useCallback(() => {
    if (total <= 1) {
      const next = [''];
      setLocalNotes(next); setLocalIdx(0);
      updateSetting('notes', next); updateSetting('idx', 0);
      return;
    }
    const newNotes = localNotes.filter((_, i) => i !== localIdx);
    const newIdx = Math.min(localIdx, newNotes.length - 1);
    setLocalNotes(newNotes); setLocalIdx(newIdx);
    updateSetting('notes', newNotes); updateSetting('idx', newIdx);
  }, [localNotes, localIdx, total, updateSetting]);

  // ── Mode ──────────────────────────────────────────────────────────────────────
  const [mode, setMode] = useState('widget');
  const titleRef = useRef(null);
  const bodyRef = useRef(null);

  const openModal = useCallback(() => setMode('modal'), []);
  const openPage = useCallback(() => setMode('page'), []);
  const close = useCallback(() => setMode('widget'), []);

  useEffect(() => {
    if (mode === 'widget') return;
    setTimeout(() => {
      if (mode === 'page' && !titleLine.trim()) {
        titleRef.current?.focus();
      } else {
        bodyRef.current?.focus();
      }
    }, 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (mode === 'widget') return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mode, close]);

  const SEG_TRACK = {
    display: 'inline-flex', alignItems: 'center',
    background: 'rgba(0,0,0,0.05)', borderRadius: 8,
    padding: 2, gap: 1, marginLeft: 'auto',
  };
  const segBtn = (onClick, content, disabled = false, key = undefined, label = undefined) => (
    <SegBtn key={key} onClick={onClick} disabled={disabled} label={label}>{content}</SegBtn>
  );

  const navControls = (
    <div style={SEG_TRACK}>
      {segBtn(goPrev, <ChevronLeft size={12} />, localIdx === 0, 'prev')}
      <span style={{
        fontSize: '0.625rem', fontVariantNumeric: 'tabular-nums', fontWeight: 600,
        color: 'var(--w-ink-4)', padding: '0 4px', userSelect: 'none',
      }}>
        {localIdx + 1}/{total}
      </span>
      {segBtn(goNext, <ChevronRight size={12} />, localIdx >= total - 1, 'next')}

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)', margin: '0 2px', flexShrink: 0 }} />

      {segBtn(addNote, <Plus size={13} />, false, 'add', 'New note')}

      {/* Divider */}
      <div style={{ width: 1, height: 16, background: 'rgba(0,0,0,0.1)', margin: '0 2px', flexShrink: 0 }} />

      <ConfirmButton
        onConfirm={deleteNote}
        label={total <= 1 ? 'Clear note' : 'Delete note'}
        style={{ borderRadius: 6, padding: '2px 7px', minHeight: 22, fontSize: '0.6875rem', fontWeight: 600, lineHeight: 1 }}
      >
        <DashLg size={12} />
      </ConfirmButton>
    </div>
  );

  // ── Widget bottom nav: [‹] [● ○] [›] ─────────────────────────────────────────
  const widgetNav = (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 4, paddingBottom: 8, paddingTop: 4, flexShrink: 0,
    }}>
      {localNotes.map((note, i) => (
        <NavDot
          key={`dot-${i}-${note.slice(0, 6)}`}
          active={i === localIdx}
          label={`Note ${i + 1} of ${total}`}
          onClick={() => jumpTo(i)}
        />
      ))}
    </div>
  );

  // ── Widget card ───────────────────────────────────────────────────────────────
  const widgetCard = (
    <BaseWidget className="flex flex-col overflow-hidden" cardStyle={{ borderRadius: '14px' }} onRemove={onRemove}>
      {/* Header: traffic lights + title, both appear on hover */}
      <div className="shrink-0" style={{ position: 'relative', height: 32, ...DASH_SEP }}>
        <div
          className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center"
          style={{ position: 'absolute', inset: 0, paddingLeft: PAD, paddingRight: PAD }}
        >
          <TrafficLights
            onRed={onRemove} onYellow={openModal} onGreen={openPage}
            redLabel="Remove widget" yellowLabel="Expand to modal" greenLabel="Full screen"
            redDisabled
          />
          <span style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            fontSize: '0.6875rem', fontWeight: 500, pointerEvents: 'none',
            color: titleLine.trim() ? 'var(--w-ink-4)' : 'var(--w-ink-6)',
            maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {titleLine.trim() || 'Notes'}
          </span>
        </div>
      </div>

      {/* Plain-text textarea in widget card — no markdown rendering */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `8px ${PAD}px 0` }}>
        <textarea
          className="notes-textarea"
          value={bodyText}
          onChange={(e) => handleBodyChange(e.target.value)}
          placeholder="Start typing…"
          style={{ flex: 1 }}
        />
      </div>

      {/* Bottom nav — prev/dots/next always visible */}
      {widgetNav}
    </BaseWidget>
  );

  // ── Modal ─────────────────────────────────────────────────────────────────────
  const modalOverlay = mode === 'modal' && (
    <Modal onClose={close} className="flex flex-col" style={{ width: 680, height: 520 }} ariaLabel="Notes">
      {/* Header: traffic lights + centered title */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', height: 44, flexShrink: 0,
        paddingLeft: PAD, paddingRight: PAD,
        borderBottom: '1px solid rgba(0,0,0,0.07)',
      }}>
        <TrafficLights
          onRed={close} onYellow={close} onGreen={openPage}
          redLabel="Close" yellowLabel="Close" greenLabel="Full screen"
          yellowDisabled
        />
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: '0.8125rem', fontWeight: 600, pointerEvents: 'none',
          color: titleLine.trim() ? 'var(--w-ink-2)' : 'var(--w-ink-5)',
          maxWidth: '55%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {titleLine.trim() || 'Untitled'}
        </span>
      </div>

      {/* Lexical WYSIWYG editor — lazy loaded, only fetched on first open */}
      <Suspense fallback={<div style={{ flex: 1, padding: PAD, color: 'var(--w-ink-5)', fontSize: '0.875rem' }}>…</div>}>
        <LexicalEditor
          ref={bodyRef}
          value={bodyText}
          onChange={handleBodyChange}
          placeholder="Start typing…"
          className="lex-content"
          style={{
            flex: 1,
            padding: `${PAD}px ${PAD}px`,
            fontSize: '0.875rem', color: 'var(--w-ink-1)',
            overflowY: 'auto', minHeight: 0, outline: 'none',
          }}
        />
      </Suspense>

      {/* Dot nav at bottom center (only when multiple notes) */}
      {total > 1 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: 4, paddingBottom: 14, paddingTop: 4, flexShrink: 0,
        }}>
          {localNotes.map((note, i) => (
            <NavDot
              key={`modal-dot-${i}-${note.slice(0, 6)}`}
              active={i === localIdx}
              label={`Note ${i + 1} of ${total}`}
              onClick={() => jumpTo(i)}
            />
          ))}
        </div>
      )}
    </Modal>
  );

  // ── Full-page ────────────────────────────────────────────────────────────────
  const pageOverlay = mode === 'page' && createPortal(
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 200, background: 'var(--w-surface)' }}>
      {/* Top bar */}
      <div style={{
        position: 'relative', display: 'flex', alignItems: 'center', height: 44, flexShrink: 0,
        paddingLeft: 18, paddingRight: 18,
        background: 'var(--w-surface)',
        borderBottom: '1px solid var(--w-border)',
      }}>
        <TrafficLights
          onRed={close} onYellow={openModal} onGreen={close}
          redLabel="Close" yellowLabel="Shrink to modal" greenLabel="Close"
          greenDisabled
        />
        <span style={{
          position: 'absolute', left: '50%', transform: 'translateX(-50%)',
          fontSize: '0.8125rem', fontWeight: 600, pointerEvents: 'none',
          color: titleLine.trim() ? 'var(--w-ink-2)' : 'var(--w-ink-5)',
          maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {titleLine.trim() || 'Untitled'}
        </span>
        {navControls}
      </div>

      {/* Centred writing column */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{
          flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          maxWidth: 740, width: '100%', margin: '0 auto',
          padding: '20px 28px 14px',
        }}>
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={titleLine}
            onChange={handleTitleChange}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); bodyRef.current?.focus(); } }}
            placeholder="Title"
            className="notes-title"
            style={{
              display: 'block', width: '100%', border: 'none', outline: 'none',
              background: 'transparent', padding: 0, paddingLeft: 6, fontFamily: 'inherit',
              fontSize: '2rem', fontWeight: 700, color: 'var(--w-ink-1)',
              lineHeight: 1.2, letterSpacing: '-0.02em', flexShrink: 0,
            }}
          />
          {/* Lexical WYSIWYG editor — lazy loaded */}
          <Suspense fallback={<div style={{ flex: 1, paddingTop: 18, color: 'var(--w-ink-5)' }}>…</div>}>
            <LexicalEditor
              ref={bodyRef}
              value={bodyText}
              onChange={handleBodyChange}
              placeholder="Start typing…"
              autoFocus={mode === 'page' && !titleLine.trim() ? false : mode === 'page'}
              className="lex-content"
              style={{
                flex: 1, fontSize: '0.9375rem', color: 'var(--w-ink-1)',
                overflowY: 'auto', paddingTop: 12, minHeight: 0, outline: 'none',
              }}
            />
          </Suspense>
          {localText.trim() && (
            <div style={{
              paddingTop: 14, fontSize: '0.625rem',
              color: 'var(--w-ink-6)', letterSpacing: '0.04em', flexShrink: 0,
            }}>
              {wordCount}&thinsp;{wordCount === 1 ? 'word' : 'words'}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );

  return (
    <>
      {widgetCard}
      {modalOverlay}
      {pageOverlay}
    </>
  );
};
