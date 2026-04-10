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
import { XLg, Link45deg, CheckLg } from 'react-bootstrap-icons';
import bgImage from '../../assets/img/bg.webp';
import { SettingsInput } from './SettingsInput';
import { SegmentedControl } from './SegmentedControl';
import {
  getPhotoLibrary,
  downloadCuratedPhotos,
  deletePhoto,
  jumpToPhotoById,
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

const OrbPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col gap-4">
    {/* Mini orb preview — uses the current accent colour */}
    <div className="w-full rounded-xl overflow-hidden relative select-none"
      style={{ aspectRatio: '16/9', background: 'var(--w-page-bg)' }} aria-hidden>
      <div style={{ position: 'absolute', inset: 0, animation: 'bpOrbSpin 14s linear infinite', transformOrigin: '50% 50%', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', width: '70%', height: '70%', top: '15%', left: '15%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.55) 0%, rgba(var(--w-accent-rgb),0.18) 45%, transparent 70%)', filter: 'blur(24px)', animation: 'bpOrbBloom 5s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', width: '45%', height: '45%', top: '5%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.32) 0%, transparent 65%)', filter: 'blur(24px)' }} />
        <div style={{ position: 'absolute', width: '40%', height: '40%', bottom: '5%', left: '5%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.20) 0%, transparent 62%)', filter: 'blur(32px)', animation: 'bpOrbCounter 9s linear infinite', transformOrigin: '50% 50%' }} />
      </div>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, color-mix(in srgb, var(--w-page-bg) 55%, transparent) 65%, var(--w-page-bg) 100%)' }} />
      {isActive && <ActiveBadge />}
    </div>
    {!isActive && (
      <button onClick={() => onApply({ orbId: 'accent' })}
        className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer hover:opacity-90"
        style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}>
        Use Color Motion
      </button>
    )}
  </div>
);

// ─── Curated panel ────────────────────────────────────────────────────────────

const CuratedPanel = ({ isActive, onApply, onRotatePhoto, allowRotate, isDefaultActive, onApplyDefault, initialPhotoUrl = null }) => {
  const [library, setLibrary] = useState(() => getPhotoLibrary());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(null);
  const refresh = useCallback(() => setLibrary(getPhotoLibrary()), []);

  // Track the active photo ID — seeded from initialPhotoUrl on open,
  // then updated locally as the user selects photos.
  const [selectedPhotoId, setSelectedPhotoId] = useState(() => {
    if (!initialPhotoUrl) return null;
    const lib = getPhotoLibrary();
    return lib.find(p => p.regular === initialPhotoUrl || p.url === initialPhotoUrl || p.small === initialPhotoUrl)?.id ?? null;
  });

  const handleDownloadAll = async () => {
    setDownloading(true);
    setDownloadError(null);
    try {
      const photos = await downloadCuratedPhotos();
      if (photos?.length) {
        refresh();
        if (allowRotate) {
          await onRotatePhoto?.(photos[0].id);
          onApply();
        } else {
          const url = photos[0]?.regular || photos[0]?.url || photos[0]?.small || null;
          setSelectedPhotoId(photos[0]?.id ?? null);
          onApply(url);
        }
      } else {
        setDownloadError('Could not reach the server. Check your connection and try again.');
      }
    } catch (err) {
      setDownloadError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleUse = async (id) => {
    if (selectedPhotoId === id && isActive) return;
    if (allowRotate) {
      await onRotatePhoto?.(id);
      refresh();
      onApply();
    } else {
      jumpToPhotoById(id);
      refresh();
      setSelectedPhotoId(id);
      // Pass the photo URL explicitly so canvas bg stores it directly
      // and doesn't depend on reading the shared photo library[0] at render time.
      const photo = getPhotoLibrary()[0];
      const url = photo?.regular || photo?.url || photo?.small || null;
      onApply(url);
    }
  };

  const handleDelete = async (id) => {
    const wasActive = (selectedPhotoId ?? library[0]?.id) === id;
    deletePhoto(id);
    const nextLib = getPhotoLibrary();
    if (wasActive) {
      if (allowRotate) {
        await onRotatePhoto?.(nextLib[0]?.id);
      } else {
        // In canvas mode: move to the next available photo or fall back to default
        const next = nextLib[0];
        const nextUrl = next ? (next.regular || next.url || next.small || null) : null;
        setSelectedPhotoId(next?.id ?? null);
        if (nextUrl) {
          jumpToPhotoById(next.id);
          onApply(nextUrl);
        } else {
          onApplyDefault?.();
        }
      }
    }
    refresh();
  };

  const activeId = isActive ? (selectedPhotoId ?? library[0]?.id) : null;

  return (
    <div className="flex flex-col gap-2">
      {/* ── Unified grid: built-in first, curated after, download card at end ── */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 overflow-y-auto" style={{ maxHeight: 248, scrollbarWidth: 'none' }}>

          {/* Cell 0: Built-in bg.webp */}
          <button
            className="relative rounded-lg overflow-hidden cursor-pointer group focus:outline-none"
            style={{ aspectRatio: '4/3', display: 'block', padding: 0, border: 'none' }}
            onClick={onApplyDefault}
            aria-label="Use built-in background"
          >
            <img src={bgImage} alt="" aria-hidden className="w-full h-full object-cover" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: 'rgba(0,0,0,0.28)' }} />
            {isDefaultActive && <ActiveBadge />}
            <div className="absolute bottom-1 left-1 pointer-events-none">
              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.52)', color: '#fff', letterSpacing: '0.06em' }}>Built-in</span>
            </div>
          </button>

          {/* Curated photo cells */}
          {library.map((ph) => {
            const src = ph.small || ph.url || ph.regular;
            const isPhotoActive = ph.id === activeId;
            return (
              <button
                key={ph.id}
                className="relative rounded-lg overflow-hidden cursor-pointer group focus:outline-none"
                style={{ aspectRatio: '4/3', display: 'block', padding: 0, border: 'none' }}
                onClick={() => handleUse(ph.id)}
                aria-label="Apply this background"
              >
                <img src={src} alt="" aria-hidden className="w-full h-full object-cover" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: 'rgba(0,0,0,0.3)' }} />
                {isPhotoActive && <ActiveBadge />}
                <button
                  onClick={e => { e.stopPropagation(); handleDelete(ph.id); }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity btn-close focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid transparent' }}
                  aria-label="Remove photo"
                >
                  <XLg size={7} />
                </button>
              </button>
            );
          })}

          {/* Locked placeholder cells — one per remaining slot, game-unlock style */}
          {Array.from({ length: LIBRARY_MAX - library.length }).map((_, i) => {
            const isFirst = i === 0;
            const isShimmering = downloading && !isFirst;
            return (
              <button
                key={`locked-slot-${library.length + i}`}
                onClick={isFirst ? handleDownloadAll : undefined}
                disabled={downloading || !isFirst}
                className="relative rounded-lg flex flex-col items-center justify-center gap-1 focus:outline-none disabled:cursor-default overflow-hidden"
                style={{
                  aspectRatio: '4/3',
                  background: 'var(--w-surface-2)',
                  border: '1px solid var(--w-border)',
                  cursor: isFirst && !downloading ? 'pointer' : 'default',
                  opacity: (!downloading && !isFirst) ? 0.38 : 1,
                }}
                aria-label={isFirst ? 'Download curated collection' : undefined}
              >
                {isShimmering && (
                  <div className="absolute inset-0" style={{
                    background: 'linear-gradient(90deg, var(--w-surface-2) 0%, var(--w-border) 50%, var(--w-surface-2) 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.4s ease-in-out infinite',
                  }} />
                )}
                {isFirst && downloading ? (
                  <Spinner size={14} style={{ color: 'var(--w-ink-5)' }} />
                ) : !isShimmering && (
                  /* Download icon */
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"
                    style={{ color: isFirst ? 'var(--w-ink-4)' : 'var(--w-ink-6)' }}>
                    <path d="M12 3v11m0 0-3.5-3.5M12 14l3.5-3.5M4 19h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {isFirst && !downloading && (
                  <span className="text-[9px] font-semibold text-center leading-tight px-1" style={{ color: 'var(--w-ink-5)' }}>
                    Download other backgrounds
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Scroll-hint fade — only visible when content overflows */}
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-lg" style={{ background: 'linear-gradient(to bottom, transparent, var(--w-surface))' }} />
      </div>

      {/* Error message */}
      {downloadError && (
        <p className="text-[10px] font-medium text-center px-2 py-1.5 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)', color: 'rgb(185,28,28)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {downloadError}
        </p>
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

    const img = new globalThis.Image();
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
              placeholder="https://buymemomo.com/sarojbelbase"
              autoComplete="off" spellCheck={false}
              icon={<Link45deg size={13} />}
              suffix={(() => {
                if (status === 'ok') return <CheckLg size={12} style={{ color: 'rgb(34,197,94)', marginRight: 4, flexShrink: 0 }} />;
                if (status === 'checking') return <span style={{ marginRight: 4 }}><Spinner size={12} /></span>;
                return null;
              })()}
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
  { id: 'solid', label: 'Solid' },
  { id: 'orb', label: 'Motion' },
  { id: 'curated', label: 'Photos' },
  { id: 'custom', label: 'URL' },
];

const FOCUS_TABS = [
  { id: 'default', label: 'Default' },
  { id: 'orb', label: 'Motion' },
  { id: 'curated', label: 'Photos' },
  { id: 'custom', label: 'URL' },
];

// ─── Main BackgroundPicker modal ──────────────────────────────────────────────

export const BackgroundPicker = ({
  scope = 'canvas',
  initialSource = 'orb',
  initialOrbId = 'blueberry',
  initialCustomUrl = null,
  initialPhotoUrl = null,
  onClose,
  onApply,
  onRotatePhoto,
}) => {
  const [activeSource, setActiveSource] = useState(initialSource);
  const [tab, setTab] = useState(initialSource);

  const tabs = scope === 'focus' ? FOCUS_TABS : CANVAS_TABS;

  // Ensure the initial tab is in the tab list.
  // 'default' only exists in focus tabs; in canvas mode map it to 'curated'.
  const resolvedTab = tabs.find(t => t.id === tab)?.id
    ?? (tab === 'default' ? 'curated' : tabs[0].id);

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
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer focus:outline-none"
            style={{ color: 'var(--w-ink-4)' }}>
            <XLg size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4 shrink-0">
          <SegmentedControl
            options={tabs.map(t => ({ label: t.label, value: t.id }))}
            value={resolvedTab}
            onChange={setTab}
          />
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
              onApply={(opts) => handleApply('orb', opts)}
            />
          )}
          {resolvedTab === 'curated' && (
            <CuratedPanel
              isActive={activeSource === 'curated'}
              isDefaultActive={activeSource === 'default'}
              allowRotate={scope === 'focus'}
              initialPhotoUrl={initialPhotoUrl}
              onApply={(url) => handleApply('curated', url ? { url } : {})}
              onApplyDefault={() => handleApply('default')}
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
