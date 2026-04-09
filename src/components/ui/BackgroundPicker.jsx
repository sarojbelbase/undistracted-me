/**
 * BackgroundPicker — shared full-screen background selection modal.
 *
 * Used by both Canvas mode (via Settings panel) and Focus mode (via TopBar).
 * All storage is delegated to the caller via `onApply` — this component is
 * purely presentational and communicates intent upward.
 *
 * Props:
 *   scope          'canvas' | 'focus'
 *   initialSource  active bg type: 'solid'|'orb'|'curated'|'custom'|'default'
 *   initialOrbId   initially-selected orb palette id, e.g. 'blueberry'
 *   initialCustomUrl  currently saved custom URL (or null)
 *   onClose()      dismiss
 *   onApply(type, opts)
 *     type: 'solid' | 'orb' | 'curated' | 'custom' | 'default'
 *     opts: { orbId?: string, url?: string | null }
 *   onRotatePhoto(targetId?)  jump to / shuffle curated library (focus only)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg, Link45deg, CheckLg, Image } from 'react-bootstrap-icons';
import bgImage from '../../assets/img/bg.webp';
import { SettingsInput } from './SettingsInput';
import {
  getPhotoLibrary,
  downloadCuratedPhotos,
  downloadNewPhoto,
  deletePhoto,
  LIBRARY_MAX,
} from '../../utilities/unsplash';

// ─── Orb colour palettes (shared + exported) ────────────────────────────────

export const ORB_PALETTES = [
  { id: 'blueberry', label: 'Blueberry', rgb: '54,133,230' },
  { id: 'strawberry', label: 'Strawberry', rgb: '198,38,46' },
  { id: 'bubblegum', label: 'Bubblegum', rgb: '222,62,128' },
  { id: 'grape', label: 'Grape', rgb: '165,109,226' },
  { id: 'orange', label: 'Orange', rgb: '243,115,41' },
  { id: 'mint', label: 'Mint', rgb: '40,188,163' },
  { id: 'latte', label: 'Latte', rgb: '207,162,94' },
];

export const getOrbRgbById = (id) =>
  ORB_PALETTES.find(p => p.id === id)?.rgb || ORB_PALETTES[0].rgb;

// ─── URL validation ──────────────────────────────────────────────────────────

const VALID_HTTPS = /^https?:\/\/.+/i;
const VALID_EXT = /^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;
const classifyUrl = (raw) => {
  const s = raw.trim();
  if (!s) return { ok: false, hint: null };
  if (VALID_EXT.test(s)) return { ok: true, hint: null };
  if (VALID_HTTPS.test(s)) return { ok: true, hint: 'No image extension detected — will verify on Apply.' };
  return { ok: false, hint: 'Must be a valid https:// URL.' };
};

// ─── Spinner ─────────────────────────────────────────────────────────────────

const Spinner = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    style={{ animation: 'bpSpin 0.75s linear infinite', flexShrink: 0 }} aria-hidden>
    <circle cx="8" cy="8" r="6" stroke="var(--w-border)" strokeWidth="2.2" />
    <path d="M8 2 A6 6 0 0 1 14 8" stroke="var(--w-ink-3)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ─── Active badge ─────────────────────────────────────────────────────────────

const ActiveBadge = () => (
  <>
    <div className="absolute inset-0 rounded-xl pointer-events-none"
      style={{ boxShadow: 'inset 0 0 0 2.5px var(--w-accent)' }} />
    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 9, fontWeight: 700 }}>
      <CheckLg size={9} /><span>Active</span>
    </div>
  </>
);

// ─── Solid panel (canvas only) ───────────────────────────────────────────────

const SolidPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-full rounded-xl overflow-hidden relative" style={{ aspectRatio: '16/9' }}>
      {/* Preview: accent-tinted page colour — mirrors App.jsx pageBg computation */}
      <div className="w-full h-full" style={{
        background: 'color-mix(in srgb, var(--w-accent) 10%, var(--w-page-bg))',
      }} />
      {isActive && <ActiveBadge />}
    </div>
    <p className="text-xs text-center" style={{ color: 'var(--w-ink-4)' }}>
      A solid tint of your current accent colour — no animations.
    </p>
    {!isActive && (
      <button onClick={onApply}
        className="px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}>
        Use Solid
      </button>
    )}
  </div>
);

// ─── Default panel (focus only) ──────────────────────────────────────────────

const DefaultPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col items-center gap-4">
    <div className="w-full rounded-xl overflow-hidden relative" style={{ aspectRatio: '16/9', background: 'var(--w-surface-2)' }}>
      <img src={bgImage} alt="Default background" className="w-full h-full object-cover" />
      {isActive && <ActiveBadge />}
    </div>
    {!isActive && (
      <button onClick={onApply}
        className="px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}>
        Use Default
      </button>
    )}
  </div>
);

// ─── Orb panel ───────────────────────────────────────────────────────────────

const OrbPanel = ({ isActive, initialOrbId, onApply }) => {
  const [selectedId, setSelectedId] = useState(initialOrbId || 'blueberry');
  const selected = ORB_PALETTES.find(p => p.id === selectedId) || ORB_PALETTES[0];
  const previewRgb = selected.rgb;
  const isAlreadyActive = isActive && initialOrbId === selectedId;

  return (
    <div className="flex flex-col gap-4">
      {/* Mini orb preview */}
      <div className="w-full rounded-xl overflow-hidden relative select-none"
        style={{ aspectRatio: '16/9', background: '#060608' }} aria-hidden>
        <div style={{ position: 'absolute', inset: 0, animation: 'bpOrbSpin 14s linear infinite', transformOrigin: '50% 50%', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: '70%', height: '70%', top: '15%', left: '15%', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, rgba(${previewRgb},0.55) 0%, rgba(${previewRgb},0.18) 45%, transparent 70%)`, filter: 'blur(24px)', animation: 'bpOrbBloom 5s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: '45%', height: '45%', top: '5%', right: '5%', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, rgba(${previewRgb},0.32) 0%, transparent 65%)`, filter: 'blur(24px)' }} />
          <div style={{ position: 'absolute', width: '40%', height: '40%', bottom: '5%', left: '5%', borderRadius: '50%', background: `radial-gradient(circle at 50% 50%, rgba(${previewRgb},0.20) 0%, transparent 62%)`, filter: 'blur(32px)', animation: 'bpOrbCounter 9s linear infinite', transformOrigin: '50% 50%' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, rgba(4,4,6,0.5) 65%, rgba(2,2,4,0.9) 100%)' }} />
        {isAlreadyActive && <ActiveBadge />}
      </div>

      {/* Palette swatches */}
      <div className="grid grid-cols-4 gap-2">
        {ORB_PALETTES.map(({ id, label, rgb }) => {
          const isSel = selectedId === id;
          return (
            <button key={id} onClick={() => setSelectedId(id)}
              className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl transition-all focus:outline-none cursor-pointer"
              style={isSel
                ? { background: 'var(--w-surface-2)', border: `1px solid rgba(${rgb},0.5)`, boxShadow: `0 0 0 1px rgba(${rgb},0.3)` }
                : { background: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
              <div className="w-8 h-8 rounded-full relative shrink-0 flex items-center justify-center"
                style={{ background: `radial-gradient(circle at 38% 38%, rgb(${rgb}) 0%, rgba(${rgb},0.6) 55%, rgba(${rgb},0.15) 100%)`, boxShadow: isSel ? `0 0 12px rgba(${rgb},0.55)` : 'none', transition: 'box-shadow 0.2s' }}>
                {isSel && <CheckLg size={10} style={{ color: '#fff', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />}
              </div>
              <span className="text-[9px] font-semibold leading-none" style={{ color: isSel ? 'var(--w-ink-1)' : 'var(--w-ink-4)', transition: 'color 0.18s' }}>{label}</span>
            </button>
          );
        })}
      </div>

      {!isAlreadyActive && (
        <button onClick={() => onApply({ orbId: selectedId })}
          className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer hover:opacity-90"
          style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}>
          Use Color Motion
        </button>
      )}
    </div>
  );
};

// ─── Curated panel ────────────────────────────────────────────────────────────

const CuratedPanel = ({ isActive, onApply, onRotatePhoto, allowRotate }) => {
  const [library, setLibrary] = useState(() => getPhotoLibrary());
  const [downloading, setDownloading] = useState(false);
  const [shuffling, setShuffling] = useState(false);
  const [addingOne, setAddingOne] = useState(false);
  const refresh = useCallback(() => setLibrary(getPhotoLibrary()), []);

  const handleDownloadAll = async () => {
    const wasEmpty = getPhotoLibrary().length === 0;
    setDownloading(true);
    try {
      const photos = await downloadCuratedPhotos();
      if (photos?.length) {
        refresh();
        if (allowRotate) await onRotatePhoto?.(photos[0].id);
        if (wasEmpty) onApply();
      }
    } finally { setDownloading(false); }
  };

  const handleShuffle = async () => {
    if (shuffling || library.length <= 1) return;
    setShuffling(true);
    try { await onRotatePhoto?.(); refresh(); }
    finally { setShuffling(false); }
  };

  const handleAddOne = async () => {
    if (addingOne || library.length >= LIBRARY_MAX) return;
    const wasEmpty = library.length === 0;
    setAddingOne(true);
    try {
      const photo = await downloadNewPhoto();
      refresh();
      if (photo) {
        if (allowRotate) await onRotatePhoto?.(photo.id);
        if (wasEmpty) onApply();
      }
    } finally { setAddingOne(false); }
  };

  const handleUse = async (id) => {
    if (library[0]?.id === id) return;
    if (allowRotate) await onRotatePhoto?.(id);
    refresh();
    if (!isActive) onApply();
  };

  const handleDelete = async (id) => {
    const wasActive = library[0]?.id === id;
    deletePhoto(id);
    if (wasActive && allowRotate) await onRotatePhoto?.();
    refresh();
  };

  if (library.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl py-10 px-6 text-center"
        style={{ background: 'var(--w-surface-2)', border: '1px dashed var(--w-border)' }}>
        <Image size={28} style={{ color: 'var(--w-ink-5)' }} />
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--w-ink-1)' }}>No photos yet</p>
          <p className="text-[11px]" style={{ color: 'var(--w-ink-4)' }}>Download the curated set to use handpicked calming landscapes.</p>
        </div>
        <button onClick={handleDownloadAll} disabled={downloading}
          className="relative overflow-hidden flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold cursor-pointer disabled:cursor-wait"
          style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', minWidth: 180 }}>
          {downloading && <span className="absolute inset-0 origin-left" style={{ background: 'rgba(255,255,255,0.18)', animation: 'bpIndeterminate 1.4s ease-in-out infinite' }} />}
          <span className="relative flex items-center gap-2">
            {downloading && <Spinner size={12} />}
            {downloading ? 'Downloading…' : 'Download all backgrounds'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {library.map((ph, i) => {
          const isHead = i === 0;
          const isPhotoActive = isHead && isActive;
          return (
            <div key={ph.id}
              className="relative group rounded-xl overflow-hidden cursor-pointer"
              style={{ aspectRatio: '16/9', transition: 'transform 0.15s' }}
              onClick={() => handleUse(ph.id)}
              onMouseEnter={e => { if (!isPhotoActive) e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
              <img src={ph.small} alt={ph.id} className="w-full h-full object-cover" style={{ opacity: isPhotoActive ? 1 : 0.68 }} />
              {isPhotoActive && (
                <>
                  <div className="absolute inset-0 rounded-xl pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2.5px var(--w-accent)' }} />
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 8, fontWeight: 700 }}>
                    <CheckLg size={7} /><span>Active</span>
                  </div>
                </>
              )}
              {!isPhotoActive && (
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0,0,0,0.22)' }}>
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full font-bold"
                    style={{ background: 'rgba(255,255,255,0.92)', color: '#111', fontSize: 10 }}>Use</div>
                </div>
              )}
              <button onClick={(e) => { e.stopPropagation(); handleDelete(ph.id); }}
                className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.85)', fontSize: 8 }}
                title="Remove from library">✕</button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        {allowRotate && (
          <button onClick={handleShuffle} disabled={shuffling || library.length <= 1}
            className="flex-1 text-[11px] py-2 rounded-lg font-semibold focus:outline-none"
            style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: library.length <= 1 ? 'var(--w-ink-6)' : 'var(--w-ink-2)', cursor: library.length <= 1 ? 'not-allowed' : 'pointer' }}>
            {shuffling ? '…' : '↺ Shuffle'}
          </button>
        )}
        <button onClick={handleAddOne} disabled={addingOne || library.length >= LIBRARY_MAX}
          className="flex-1 relative overflow-hidden text-[11px] py-2 rounded-lg font-semibold focus:outline-none"
          style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: library.length >= LIBRARY_MAX ? 'var(--w-ink-6)' : 'var(--w-ink-2)', cursor: library.length >= LIBRARY_MAX ? 'not-allowed' : (addingOne ? 'wait' : 'pointer') }}>
          {addingOne && <span className="absolute inset-0" style={{ background: 'var(--w-accent)', opacity: 0.12, animation: 'bpIndeterminate 1.4s ease-in-out infinite' }} />}
          <span className="relative">{library.length >= LIBRARY_MAX ? 'Library full' : addingOne ? 'Fetching…' : '+ Add one'}</span>
        </button>
        <button onClick={handleDownloadAll} disabled={downloading || library.length >= LIBRARY_MAX}
          className="flex-1 relative overflow-hidden text-[11px] py-2 rounded-lg font-semibold focus:outline-none"
          style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: library.length >= LIBRARY_MAX ? 'var(--w-ink-6)' : 'var(--w-ink-2)', cursor: library.length >= LIBRARY_MAX ? 'not-allowed' : (downloading ? 'wait' : 'pointer') }}>
          {downloading && <span className="absolute inset-0" style={{ background: 'var(--w-accent)', opacity: 0.12, animation: 'bpIndeterminate 1.4s ease-in-out infinite' }} />}
          <span className="relative">{downloading ? 'Fetching…' : '↓ Refill'}</span>
        </button>
      </div>

      {!isActive && (
        <button onClick={onApply}
          className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer"
          style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}>
          Use Curated Photos
        </button>
      )}
    </div>
  );
};

// ─── Custom URL panel ─────────────────────────────────────────────────────────

const CustomPanel = ({ isActive, initialCustomUrl, onApply }) => {
  const [value, setValue] = useState(initialCustomUrl || '');
  const [status, setStatus] = useState('idle'); // idle | checking | ok | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const { ok: syntaxOk, hint } = classifyUrl(value);

  const verify = useCallback(() => {
    const url = value.trim();
    if (!classifyUrl(url).ok) { setErrorMsg('Enter an https:// image URL to continue.'); setStatus('error'); return; }
    setStatus('checking'); setPreviewUrl(null); setErrorMsg('');

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => { img.src = ''; setPreviewUrl(url); setStatus('ok'); }, 5000);
    img.onload = () => { clearTimeout(timeout); setPreviewUrl(url); setStatus('ok'); };
    img.onerror = () => { clearTimeout(timeout); setPreviewUrl(url); setStatus('ok'); setErrorMsg('Could not verify — the URL may still work.'); };
    img.src = url;
  }, [value]);

  const handleApply = () => {
    const url = value.trim();
    if (!url) return;
    onApply({ url });
  };

  const handleClear = () => {
    setValue(''); setPreviewUrl(null); setStatus('idle');
    onApply({ url: null });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--w-ink-4)' }} htmlFor="bpUrlInput">
          Image URL
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SettingsInput ref={inputRef} id="bpUrlInput" type="url" value={value}
              onChange={(e) => { setValue(e.target.value); setStatus('idle'); setPreviewUrl(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              placeholder="https://example.com/image.jpg"
              autoComplete="off" spellCheck={false}
              icon={<Link45deg size={13} />}
              suffix={
                status === 'ok' ? <CheckLg size={12} style={{ color: 'rgb(34,197,94)', marginRight: 4, flexShrink: 0 }} /> :
                  status === 'checking' ? <span style={{ marginRight: 4 }}><Spinner size={12} /></span> : null
              }
            />
          </div>
          <button onClick={verify} disabled={!syntaxOk || status === 'checking'}
            className="px-3.5 py-2 rounded-xl text-[11px] font-semibold focus:outline-none disabled:opacity-40 shrink-0"
            style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: 'var(--w-ink-2)', cursor: syntaxOk ? 'pointer' : 'not-allowed' }}>
            Verify
          </button>
        </div>
        {hint && !errorMsg && <p className="text-[10px]" style={{ color: 'rgba(234,179,8,0.9)' }}>{hint}</p>}
        {errorMsg && <p className="text-[10px]" style={{ color: 'rgba(220,38,38,0.9)' }}>{errorMsg}</p>}
      </div>

      {previewUrl && (
        <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--w-surface-2)' }}>
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" style={{ opacity: status === 'ok' ? 1 : 0.5 }} />
        </div>
      )}

      <div className="flex gap-2">
        {initialCustomUrl && (
          <button onClick={handleClear}
            className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: 'var(--w-ink-3)' }}>
            Clear
          </button>
        )}
        <button onClick={handleApply} disabled={!value.trim()}
          className="flex-1 py-2 rounded-xl text-xs font-semibold focus:outline-none disabled:opacity-40"
          style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', cursor: value.trim() ? 'pointer' : 'not-allowed' }}>
          {isActive ? 'Update URL' : 'Use This URL'}
        </button>
      </div>
    </div>
  );
};

// ─── Tab config per scope ─────────────────────────────────────────────────────

const CANVAS_TABS = [
  { id: 'orb', label: 'Motion' },
  { id: 'solid', label: 'Solid' },
  { id: 'curated', label: 'Photos' },
  { id: 'custom', label: 'URL' },
];

const FOCUS_TABS = [
  { id: 'orb', label: 'Motion' },
  { id: 'default', label: 'Default' },
  { id: 'curated', label: 'Photos' },
  { id: 'custom', label: 'URL' },
];

// ─── Main BackgroundPicker modal ──────────────────────────────────────────────

export const BackgroundPicker = ({
  scope = 'canvas',
  initialSource = 'orb',
  initialOrbId = 'blueberry',
  initialCustomUrl = null,
  onClose,
  onApply,
  onRotatePhoto,
}) => {
  const [activeSource, setActiveSource] = useState(initialSource);
  const [tab, setTab] = useState(initialSource);

  const tabs = scope === 'focus' ? FOCUS_TABS : CANVAS_TABS;

  // Ensure the initial tab is in the tab list; fall back to first
  const resolvedTab = tabs.find(t => t.id === tab) ? tab : tabs[0].id;

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleApply = useCallback((type, opts = {}) => {
    setActiveSource(type);
    onApply?.(type, opts);
  }, [onApply]);

  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Background settings"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 80, background: 'rgba(0,0,0,0.60)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes bpSpin          { to { transform: rotate(360deg); } }
        @keyframes bpOrbSpin       { to { transform: rotate(360deg); } }
        @keyframes bpOrbCounter    { to { transform: rotate(-360deg); } }
        @keyframes bpOrbBloom      { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.78;transform:scale(1.18)} }
        @keyframes bpIn            { from{opacity:0;transform:scale(.97) translateY(8px)} to{opacity:1;transform:none} }
        @keyframes bpIndeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
      `}</style>

      <div
        className="flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--w-surface)',
          border: '1px solid var(--w-border)',
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          animation: 'bpIn 0.22s cubic-bezier(.32,.72,0,1) both',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--w-border)' }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: 'var(--w-ink-1)' }}>
              {scope === 'focus' ? 'Focus Mode Background' : 'Canvas Background'}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
              Choose how your {scope === 'focus' ? 'focus screen' : 'home canvas'} looks
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full transition-opacity hover:opacity-60 cursor-pointer focus:outline-none"
            style={{ color: 'var(--w-ink-4)' }}>
            <XLg size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 px-5 pt-4 shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold mr-1 transition-all focus:outline-none cursor-pointer"
              style={resolvedTab === t.id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'transparent', color: 'var(--w-ink-4)' }}>
              {t.label}
              {activeSource === t.id && resolvedTab !== t.id && (
                <span className="ml-1.5 inline-block w-1.5 h-1.5 rounded-full align-middle" style={{ background: 'var(--w-accent)', opacity: 0.7 }} />
              )}
            </button>
          ))}
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {resolvedTab === 'solid' && (
            <SolidPanel isActive={activeSource === 'solid'} onApply={() => handleApply('solid')} />
          )}
          {resolvedTab === 'default' && (
            <DefaultPanel isActive={activeSource === 'default'} onApply={() => handleApply('default')} />
          )}
          {resolvedTab === 'orb' && (
            <OrbPanel
              isActive={activeSource === 'orb'}
              initialOrbId={initialOrbId}
              onApply={(opts) => handleApply('orb', opts)}
            />
          )}
          {resolvedTab === 'curated' && (
            <CuratedPanel
              isActive={activeSource === 'curated'}
              allowRotate={scope === 'focus'}
              onApply={() => handleApply('curated')}
              onRotatePhoto={onRotatePhoto}
            />
          )}
          {resolvedTab === 'custom' && (
            <CustomPanel
              isActive={activeSource === 'custom'}
              initialCustomUrl={initialCustomUrl}
              onApply={(opts) => {
                if (opts.url) handleApply('custom', opts);
                else if (activeSource === 'custom') handleApply(scope === 'focus' ? 'default' : 'solid', {});
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
