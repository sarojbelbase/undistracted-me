import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';

const PAD = 16;

// Custom dashed separator using background image, so it can be visible even when the header is mostly transparent.
const DASH_SEP = {
  backgroundImage: 'repeating-linear-gradient(90deg, rgba(128,128,128,0.4) 0, rgba(128,128,128,0.4) 5px, transparent 5px, transparent 10px)',
  backgroundPosition: 'bottom',
  backgroundSize: '100% 1.5px',
  backgroundRepeat: 'no-repeat',
};

// ─── Mac-style traffic lights ─────────────────────────────────────────────────
const TrafficLights = ({ onRed, onYellow, onGreen }) => (
  <div className="flex items-center gap-1.5">
    <button onClick={onGreen} onMouseDown={e => e.stopPropagation()} aria-label="Full page"
      className="w-3 h-3 rounded-full shrink-0 transition-opacity hover:opacity-75 cursor-pointer"
      style={{ backgroundColor: '#28c840' }} />
    <button onClick={onYellow} onMouseDown={e => e.stopPropagation()} aria-label="Modal"
      className="w-3 h-3 rounded-full shrink-0 transition-opacity hover:opacity-75 cursor-pointer"
      style={{ backgroundColor: '#ffbd2e' }} />
    <button onClick={onRed} onMouseDown={e => e.stopPropagation()} aria-label="Remove"
      className="w-3 h-3 rounded-full shrink-0 transition-opacity hover:opacity-75 cursor-pointer"
      style={{ backgroundColor: '#ff5f57' }} />
  </div>
);

// ─── Widget ───────────────────────────────────────────────────────────────────
export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { text: '' });
  const { text } = settings;

  const [mode, setMode] = useState('widget');
  const textareaRef = useRef(null);
  const pageTextareaRef = useRef(null);

  const pageBg = 'var(--w-surface)';
  const pageBarBg = 'var(--w-surface)';

  const openModal = useCallback(() => setMode('modal'), []);
  const openPage = useCallback(() => setMode('page'), []);
  const close = useCallback(() => setMode('widget'), []);

  useEffect(() => {
    if (mode === 'modal' && textareaRef.current) textareaRef.current.focus();
    if (mode === 'page' && pageTextareaRef.current) pageTextareaRef.current.focus();
  }, [mode]);

  useEffect(() => {
    if (mode === 'widget') return;
    const handler = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [mode, close]);

  const widgetCard = (
    <BaseWidget className="flex flex-col overflow-hidden" cardStyle={{ borderRadius: '14px' }}>
      {/* Header — custom dashed separator always visible, traffic lights fade in on hover */}
      <div
        className="shrink-0 flex items-center"
        style={{ height: 32, paddingLeft: PAD, ...DASH_SEP }}
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <TrafficLights onRed={onRemove} onYellow={openModal} onGreen={openPage} />
        </div>
      </div>
      <textarea
        value={text}
        onChange={e => updateSetting('text', e.target.value)}
        placeholder="New note…"
        spellCheck={false}
        className="notes-textarea flex-1 w-full resize-none bg-transparent outline-none text-sm leading-relaxed min-h-0"
        style={{
          color: 'var(--w-ink-1)',
          padding: PAD,
          paddingTop: 8,
          overflowY: 'auto',
        }}
      />
    </BaseWidget>
  );

  // ── Modal ──
  const modalOverlay = mode === 'modal' && createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.45)', zIndex: 150 }}
      onMouseDown={e => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        className="flex flex-col rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        style={{ width: 640, height: 460, backgroundColor: 'var(--w-surface)' }}
        onMouseDown={e => e.stopPropagation()}
      >
        <div className="flex items-center shrink-0" style={{ height: 36, paddingLeft: PAD }}>
          <TrafficLights onRed={close} onYellow={close} onGreen={openPage} />
        </div>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => updateSetting('text', e.target.value)}
          placeholder="New note…"
          spellCheck={false}
          className="notes-textarea flex-1 w-full resize-none bg-transparent outline-none text-sm leading-relaxed min-h-0"
          style={{ color: 'var(--w-ink-1)', padding: PAD, paddingTop: 8 }}
        />
      </div>
    </div>,
    document.body
  );

  // ── Full-page ──
  const pageOverlay = mode === 'page' && createPortal(
    <div className="fixed inset-0 flex flex-col animate-fade-in" style={{ zIndex: 200, backgroundColor: pageBg }}>
      <div
        className="flex items-center shrink-0"
        style={{ height: 36, paddingLeft: PAD, backgroundColor: pageBarBg }}
      >
        <TrafficLights onRed={close} onYellow={openModal} onGreen={close} />
      </div>
      <textarea
        ref={pageTextareaRef}
        value={text}
        onChange={e => updateSetting('text', e.target.value)}
        placeholder="Write something…"
        spellCheck={false}
        className="notes-textarea"
        style={{
          flex: 1,
          width: '100%',
          resize: 'none',
          background: 'transparent',
          outline: 'none',
          border: 'none',
          padding: PAD,
          paddingTop: 8,
          fontSize: '1.0625rem',
          lineHeight: 1.8,
          color: 'var(--w-ink-1)',
          overflowY: 'auto',
        }}
      />
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
