import React, { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Plus, DashLg, ArrowLeft } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { Popup } from '../../components/ui/Popup';
import { TooltipBtn } from '../../components/ui/TooltipBtn';

// Only fetched the first time a user expands a note to full-screen mode.
const LexicalEditor = lazy(() => import('./LexicalEditor'));

const PAD = 20;

// ─── Per-note hue palette (cycles by note index) ─────────────────────────────
const NOTE_HUES = [
  '#F5C842', // warm yellow
  '#F4845F', // coral
  '#5EB88A', // sage
  '#5BA4CF', // sky
  '#B49FCC', // lavender
];

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

// ─── Nav dot (pagination dot with Popup tooltip) ──────────────────────────────
const NavDot = ({ active, label, onClick, hue }) => {
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
          background: active ? hue : 'var(--w-ink-6)',
          opacity: active ? 1 : 0.35,
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

  // Widget card textarea — preserves the title (first line), updates body only
  const handleWidgetTextChange = useCallback((e) => {
    const val = e.target.value;
    setLocalNotes(prev => {
      const { titleLine: prevTitle } = splitNote(prev[localIdx] ?? '');
      const newText = mergeNote(prevTitle, val);
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

  const openPage = useCallback(() => setMode('page'), []);
  const close = useCallback(() => setMode('widget'), []);

  useEffect(() => {
    if (mode !== 'page') return;
    setTimeout(() => {
      if (!titleLine.trim()) titleRef.current?.focus();
      else bodyRef.current?.focus();
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

  // ── Widget card ───────────────────────────────────────────────────────────────
  const noteHue = NOTE_HUES[localIdx % NOTE_HUES.length];

  const widgetCard = (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      cardStyle={{ borderRadius: '14px' }}
      onRemove={onRemove}
    >
      {/* Writing surface — 16px top breathing room, 12px before status bar */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: `16px ${PAD}px 12px` }}>
        <textarea
          id="notes-body"
          name="notes-body"
          className="notes-textarea"
          value={bodyText}
          onChange={handleWidgetTextChange}
          placeholder="New Note..."
          style={{ flex: 1 }}
        />
      </div>

      {/* Status bar — 32px tall for comfortable touch target + breathing room */}
      <div style={{
        display: 'flex', alignItems: 'center',
        height: 32, flexShrink: 0,
        paddingLeft: 14, paddingRight: 10,
        borderTop: '1px solid rgba(127,127,127,0.1)',
        gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {localNotes.map((note, i) => (
            <NavDot
              key={`dot-${i}-${note.slice(0, 6)}`}
              active={i === localIdx}
              label={`Note ${i + 1} of ${total}`}
              onClick={() => jumpTo(i)}
              hue={NOTE_HUES[i % NOTE_HUES.length]}
            />
          ))}
        </div>
        <TooltipBtn
          onClick={openPage}
          aria-label="Open in full screen"
          tooltip="Write in fullscreen"
          style={{
            flex: 1, minWidth: 0,
            textAlign: 'left', border: 'none', background: 'transparent',
            cursor: 'pointer', padding: '0 4px',
            fontSize: '0.625rem', fontWeight: 500,
            color: titleLine.trim() ? 'var(--w-ink-4)' : 'var(--w-ink-6)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            letterSpacing: '0.01em', transition: 'color 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--w-ink-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = titleLine.trim() ? 'var(--w-ink-4)' : 'var(--w-ink-6)'; }}
        >
          {titleLine.trim() || `Note ${localIdx + 1}`}
        </TooltipBtn>
        {localText.trim() && (
          <span style={{
            fontSize: '0.5625rem', fontVariantNumeric: 'tabular-nums',
            color: 'var(--w-ink-6)', letterSpacing: '0.04em',
            userSelect: 'none', flexShrink: 0,
          }}>
            {wordCount}w
          </span>
        )}
      </div>
    </BaseWidget>
  );
  // ── Full-screen ──────────────────────────────────────────────────────────────
  const pageOverlay = mode === 'page' && createPortal(
    <div className="fixed inset-0 flex flex-col" style={{ zIndex: 200, background: 'var(--w-surface)' }}>
      {/* Minimal top bar: back left, nav controls right */}
      <div style={{
        display: 'flex', alignItems: 'center', height: 44, flexShrink: 0,
        paddingLeft: 12, paddingRight: 12, gap: 8,
        borderBottom: '1px solid var(--w-border)',
      }}>
        {/* Back — same pattern as Pomodoro */}
        <button
          onClick={close}
          aria-label="Back to widget"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            height: 28, border: 'none', borderRadius: 7,
            padding: '0 10px 0 8px',
            background: 'rgba(0,0,0,0.05)', cursor: 'pointer',
            color: 'var(--w-ink-3)', flexShrink: 0,
            fontSize: '0.6875rem', fontWeight: 500,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
        >
          <ArrowLeft size={13} />
          <span>Notes</span>
        </button>
        <div style={{ marginLeft: 'auto' }}>
          {navControls}
        </div>
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
            id="notes-title"
            name="notes-title"
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
              className="lex-content lex-content--page"
              style={{
                flex: 1, color: 'var(--w-ink-1)',
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
      {pageOverlay}
    </>
  );
};
