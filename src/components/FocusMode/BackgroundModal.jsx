import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XLg, Link45deg, CheckLg, Image } from 'react-bootstrap-icons';
import bgImage from '../../assets/img/bg.webp';
import { SettingsInput } from '../ui/SettingsInput';
import {
  getBgSource,
  setBgSource,
  getPhotoLibrary,
  downloadCuratedPhotos,
  downloadNewPhoto,
  deletePhoto,
  jumpToPhotoById,
  LIBRARY_MAX,
} from '../../utilities/unsplash';

// ─── localStorage helpers for custom URL ─────────────────────────────────────

const CUSTOM_URL_KEY = 'fm_custom_bg_url';

export const getCustomBgUrl = () => {
  try { return localStorage.getItem(CUSTOM_URL_KEY) || null; }
  catch { return null; }
};

export const setCustomBgUrl = (url) => {
  try {
    if (url) localStorage.setItem(CUSTOM_URL_KEY, url);
    else localStorage.removeItem(CUSTOM_URL_KEY);
  } catch { }
};

// ─── URL validation ───────────────────────────────────────────────────────────

const VALID_HTTPS = /^https?:\/\/.+/i;
const VALID_EXT = /^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;

const classifyUrl = (raw) => {
  const s = raw.trim();
  if (!s) return { ok: false, hint: null };
  if (VALID_EXT.test(s)) return { ok: true, hint: null };
  if (VALID_HTTPS.test(s)) return { ok: true, hint: 'No image extension detected — will verify on Apply.' };
  return { ok: false, hint: 'Must be a valid https:// URL.' };
};

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = ({ size = 14 }) => (
  <svg
    width={size} height={size} viewBox="0 0 16 16" fill="none"
    style={{ animation: 'bgModalSpin 0.75s linear infinite', flexShrink: 0 }}
    aria-hidden
  >
    <circle cx="8" cy="8" r="6" stroke="var(--w-border)" strokeWidth="2.2" />
    <path d="M8 2 A6 6 0 0 1 14 8" stroke="var(--w-ink-3)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ─── Orb color palettes ──────────────────────────────────────────────────────

export const ORB_PALETTES = [
  { id: 'blueberry', label: 'Blueberry', rgb: '54,133,230' },
  { id: 'strawberry', label: 'Strawberry', rgb: '198,38,46' },
  { id: 'bubblegum', label: 'Bubblegum', rgb: '222,62,128' },
  { id: 'grape', label: 'Grape', rgb: '165,109,226' },
  { id: 'orange', label: 'Orange', rgb: '243,115,41' },
  { id: 'mint', label: 'Mint', rgb: '40,188,163' },
  { id: 'latte', label: 'Latte', rgb: '207,162,94' },
];

const ORB_PALETTE_KEY = 'fm_orb_palette_id';
export const getOrbPaletteId = () => {
  try { return localStorage.getItem(ORB_PALETTE_KEY) || 'blueberry'; } catch { return 'blueberry'; }
};
export const getOrbRgb = () => {
  const id = getOrbPaletteId();
  if (id === 'accent') return null;
  return ORB_PALETTES.find(p => p.id === id)?.rgb || null;
};
const setOrbPaletteId = (id) => {
  try { localStorage.setItem(ORB_PALETTE_KEY, id); } catch { }
};

// ─── Tab definitions ─────────────────────────────────────────────────────────

const TABS = [
  { id: 'orb', label: 'Color Motion' },
  { id: 'default', label: 'Default' },
  { id: 'curated', label: 'Curated' },
  { id: 'custom', label: 'URL' },
];

// ─── Default panel ────────────────────────────────────────────────────────────

const DefaultPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col items-center gap-4">
    <div
      className="w-full rounded-xl overflow-hidden relative"
      style={{ aspectRatio: '16/9', background: 'var(--w-surface-2)' }}
    >
      <img
        src={bgImage}
        alt="Default background"
        className="w-full h-full object-cover"
      />
      {isActive && (
        <>
          <div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: 'inset 0 0 0 2.5px var(--w-accent)' }}
          />
          <div
            className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 9, fontWeight: 700 }}
          >
            <CheckLg size={9} />
            <span>Active</span>
          </div>
        </>
      )}
    </div>
    {!isActive && (
      <button
        onClick={onApply}
        className="px-5 py-2 rounded-xl text-xs font-semibold transition-opacity focus:outline-none cursor-pointer"
        style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
      >
        Use Default
      </button>
    )}
  </div>
);

// ─── Orb panel ───────────────────────────────────────────────────────────────

const OrbPanel = ({ isActive, onApply }) => {
  const isAlreadyActive = isActive && getOrbPaletteId() === 'accent';

  const handleApply = () => {
    setOrbPaletteId('accent');
    onApply('accent');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Live mini orb preview — uses the current accent colour */}
      <div
        className="w-full rounded-xl overflow-hidden relative select-none"
        style={{ aspectRatio: '16/9', background: 'var(--w-page-bg)' }}
        aria-hidden
      >
        <div style={{
          position: 'absolute', inset: 0,
          animation: 'fmOrbSpin 48s linear infinite',
          transformOrigin: '50% 50%',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute', width: '70%', height: '70%',
            top: '15%', left: '15%', borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.55) 0%, rgba(var(--w-accent-rgb),0.18) 45%, transparent 70%)',
            filter: 'blur(24px)',
            animation: 'fmOrbBloom 8s ease-in-out infinite',
          }} />
          <div style={{
            position: 'absolute', width: '45%', height: '45%',
            top: '5%', right: '5%', borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.32) 0%, transparent 65%)',
            filter: 'blur(24px)',
          }} />
          <div style={{
            position: 'absolute', width: '40%', height: '40%',
            bottom: '5%', left: '5%', borderRadius: '50%',
            background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.20) 0%, transparent 62%)',
            filter: 'blur(32px)',
            animation: 'fmOrbCounter 32s linear infinite',
            transformOrigin: '50% 50%',
          }} />
        </div>
        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, color-mix(in srgb, var(--w-page-bg) 55%, transparent) 65%, var(--w-page-bg) 100%)',
        }} />
        {isAlreadyActive && (
          <>
            <div className="absolute inset-0 rounded-xl pointer-events-none"
              style={{ boxShadow: 'inset 0 0 0 2.5px var(--w-accent)' }} />
            <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
              style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 9, fontWeight: 700 }}>
              <CheckLg size={9} /><span>Active</span>
            </div>
          </>
        )}
      </div>

      {!isAlreadyActive && (
        <button
          onClick={handleApply}
          className="w-full py-2 rounded-xl text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
          style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
        >
          Use Color Motion
        </button>
      )}
    </div>
  );
};

// ─── Curated panel ────────────────────────────────────────────────────────────

const CuratedPanel = ({ isActive, onApply, onRotatePhoto }) => {
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
        // Auto-display the first photo and switch source immediately
        await onRotatePhoto?.(photos[0].id);
        if (wasEmpty) onApply();
      }
    } finally {
      setDownloading(false);
    }
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
        await onRotatePhoto?.(photo.id);
        if (wasEmpty) onApply();
      }
    } finally {
      setAddingOne(false);
    }
  };

  const handleUse = async (id) => {
    if (library[0]?.id === id) return;
    await onRotatePhoto?.(id);
    refresh();
    if (!isActive) onApply();
  };

  const handleDelete = async (id) => {
    const wasActive = library[0]?.id === id;
    deletePhoto(id);
    if (wasActive) await onRotatePhoto?.();
    refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      {library.length === 0 ? (
        /* ── Empty state ── */
        <div
          className="flex flex-col items-center justify-center gap-4 rounded-xl py-10 px-6 text-center"
          style={{ background: 'var(--w-surface-2)', border: '1px dashed var(--w-border)' }}
        >
          <Image size={28} style={{ color: 'var(--w-ink-5)' }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--w-ink-1)' }}>
              No photos yet
            </p>
            <p className="text-[11px]" style={{ color: 'var(--w-ink-4)' }}>
              Download the curated set to use handpicked calming landscapes.
            </p>
          </div>
          <button
            onClick={handleDownloadAll}
            disabled={downloading}
            className="relative overflow-hidden flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer disabled:cursor-wait"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', minWidth: 180 }}
          >
            {downloading && (
              <span
                className="absolute inset-0 origin-left"
                style={{ background: 'rgba(255,255,255,0.18)', animation: 'bgIndeterminate 1.4s ease-in-out infinite' }}
              />
            )}
            <span className="relative flex items-center gap-2">
              {downloading && <Spinner size={12} />}
              {downloading ? 'Downloading…' : 'Download all backgrounds'}
            </span>
          </button>
        </div>
      ) : (
        <>
          {/* ── Thumbnail grid ── */}
          <div className="grid grid-cols-3 gap-2">
            {library.map((ph, i) => {
              const isHead = i === 0;
              const isPhotoActive = isHead && isActive;
              return (
                <div
                  key={ph.id}
                  className="relative group rounded-xl overflow-hidden cursor-pointer"
                  style={{ aspectRatio: '16/9', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onClick={() => handleUse(ph.id)}
                  onMouseEnter={e => { if (!isPhotoActive) e.currentTarget.style.transform = 'scale(1.03)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
                >
                  <img
                    src={ph.small}
                    alt={ph.id}
                    className="w-full h-full object-cover transition-all duration-200"
                    style={{ opacity: isPhotoActive ? 1 : 0.68 }}
                  />

                  {/* Active state — accent ring + badge */}
                  {isPhotoActive && (
                    <>
                      <div
                        className="absolute inset-0 rounded-xl pointer-events-none"
                        style={{ boxShadow: 'inset 0 0 0 2.5px var(--w-accent)' }}
                      />
                      <div
                        className="absolute bottom-1.5 right-1.5 flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 8, fontWeight: 700 }}
                      >
                        <CheckLg size={7} /><span>Active</span>
                      </div>
                    </>
                  )}

                  {/* Hover: centered Use pill */}
                  {!isPhotoActive && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.22)' }}>
                      <div
                        className="flex items-center gap-1 px-3 py-1 rounded-full font-bold"
                        style={{ background: 'rgba(255,255,255,0.92)', color: '#111', fontSize: 10, backdropFilter: 'blur(4px)' }}
                      >
                        Use
                      </div>
                    </div>
                  )}

                  {/* Delete — top-right, hover only */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(ph.id); }}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                    style={{ background: 'rgba(0,0,0,0.65)', color: 'rgba(255,255,255,0.85)', fontSize: 8 }}
                    title="Remove from library"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* ── Actions row ── */}
          <div className="flex gap-2">
            <button
              onClick={handleShuffle}
              disabled={shuffling || library.length <= 1}
              className="flex-1 text-[11px] py-2 rounded-lg font-semibold focus:outline-none transition-opacity"
              style={{
                background: 'var(--w-surface-2)',
                border: '1px solid var(--w-border)',
                color: library.length <= 1 ? 'var(--w-ink-6)' : 'var(--w-ink-2)',
                cursor: library.length <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              {shuffling ? '…' : '↺ Shuffle'}
            </button>

            <button
              onClick={handleAddOne}
              disabled={addingOne || library.length >= LIBRARY_MAX}
              className="flex-1 relative overflow-hidden text-[11px] py-2 rounded-lg font-semibold focus:outline-none"
              style={{
                background: 'var(--w-surface-2)',
                border: '1px solid var(--w-border)',
                color: library.length >= LIBRARY_MAX ? 'var(--w-ink-6)' : 'var(--w-ink-2)',
                cursor: library.length >= LIBRARY_MAX ? 'not-allowed' : (addingOne ? 'wait' : 'pointer'),
              }}
            >
              {addingOne && (
                <span
                  className="absolute inset-0"
                  style={{ background: 'var(--w-accent)', opacity: 0.12, animation: 'bgIndeterminate 1.4s ease-in-out infinite' }}
                />
              )}
              <span className="relative" style={{ zIndex: 1 }}>
                {library.length >= LIBRARY_MAX ? 'Library full' : addingOne ? 'Fetching…' : '+ Add one'}
              </span>
            </button>

            <button
              onClick={handleDownloadAll}
              disabled={downloading || library.length >= LIBRARY_MAX}
              className="flex-1 relative overflow-hidden text-[11px] py-2 rounded-lg font-semibold focus:outline-none"
              style={{
                background: 'var(--w-surface-2)',
                border: '1px solid var(--w-border)',
                color: library.length >= LIBRARY_MAX ? 'var(--w-ink-6)' : 'var(--w-ink-2)',
                cursor: library.length >= LIBRARY_MAX ? 'not-allowed' : (downloading ? 'wait' : 'pointer'),
              }}
            >
              {downloading && (
                <span
                  className="absolute inset-0"
                  style={{ background: 'var(--w-accent)', opacity: 0.12, animation: 'bgIndeterminate 1.4s ease-in-out infinite' }}
                />
              )}
              <span className="relative" style={{ zIndex: 1 }}>
                {downloading ? 'Fetching…' : '↓ Refill'}
              </span>
            </button>
          </div>

          {/* ── Apply source button (only when not already active) ── */}
          {!isActive && (
            <button
              onClick={onApply}
              className="w-full py-2 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
              style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
            >
              Use Curated Photos
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ─── Custom URL panel ─────────────────────────────────────────────────────────

const CustomPanel = ({ isActive, onApply }) => {
  const [value, setValue] = useState(() => getCustomBgUrl() || '');
  const [status, setStatus] = useState('idle'); // idle | checking | ok | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);
  const checkRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const { ok: syntaxOk, hint } = classifyUrl(value);

  const verify = useCallback(() => {
    const url = value.trim();
    if (!classifyUrl(url).ok) {
      setErrorMsg('Enter an https:// image URL to continue.');
      setStatus('error');
      return;
    }
    setStatus('checking');
    setPreviewUrl(null);
    setErrorMsg('');
    if (checkRef.current) clearTimeout(checkRef.current);

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      img.src = '';
      setPreviewUrl(url);
      setStatus('ok');
    }, 5000);

    img.onload = () => {
      clearTimeout(timeout);
      setPreviewUrl(url);
      setStatus('ok');
    };
    img.onerror = () => {
      clearTimeout(timeout);
      setPreviewUrl(url);
      setStatus('ok');
      setErrorMsg('Could not verify — the URL may still work as a background.');
    };
    img.src = url;
  }, [value]);

  const handleApply = () => {
    const url = value.trim();
    if (!url) return;
    setCustomBgUrl(url);
    onApply(url);
  };

  const handleClear = () => {
    setValue('');
    setPreviewUrl(null);
    setStatus('idle');
    setCustomBgUrl(null);
    onApply(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div className="flex flex-col gap-1.5">
        <label
          className="text-[10px] font-bold uppercase tracking-[0.14em]"
          style={{ color: 'var(--w-ink-4)' }}
          htmlFor="bgUrlInput"
        >
          Image URL
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SettingsInput
              ref={inputRef}
              id="bgUrlInput"
              type="url"
              value={value}
              onChange={(e) => { setValue(e.target.value); setStatus('idle'); setPreviewUrl(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              placeholder="https://example.com/image.jpg"
              autoComplete="off"
              spellCheck={false}
              icon={<Link45deg size={13} />}
              suffix={
                status === 'ok'
                  ? <CheckLg size={12} style={{ color: 'rgb(34,197,94)', marginRight: 4, flexShrink: 0 }} />
                  : status === 'checking'
                    ? <span style={{ marginRight: 4 }}><Spinner size={12} /></span>
                    : null
              }
            />
          </div>
          <button
            onClick={verify}
            disabled={!syntaxOk || status === 'checking'}
            className="px-3.5 py-2 rounded-xl text-[11px] font-semibold focus:outline-none disabled:opacity-40 shrink-0"
            style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: 'var(--w-ink-2)', cursor: syntaxOk ? 'pointer' : 'not-allowed' }}
          >
            Verify
          </button>
        </div>
        {hint && !errorMsg && (
          <p className="text-[10px]" style={{ color: 'rgba(234,179,8,0.9)' }}>{hint}</p>
        )}
        {errorMsg && (
          <p className="text-[10px]" style={{ color: 'rgba(220,38,38,0.9)' }}>{errorMsg}</p>
        )}
      </div>

      {/* Preview */}
      {previewUrl && (
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{ aspectRatio: '16/9', background: 'var(--w-surface-2)' }}
        >
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            style={{ opacity: status === 'ok' ? 1 : 0.5 }}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {getCustomBgUrl() && (
          <button
            onClick={handleClear}
            className="flex-1 py-2 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
            style={{ background: 'var(--w-surface-2)', border: '1px solid var(--w-border)', color: 'var(--w-ink-3)' }}
          >
            Clear
          </button>
        )}
        <button
          onClick={handleApply}
          disabled={!value.trim()}
          className="flex-1 py-2 rounded-xl text-xs font-semibold focus:outline-none disabled:opacity-40"
          style={{
            background: 'var(--w-accent)',
            color: 'var(--w-accent-fg, #fff)',
            cursor: value.trim() ? 'pointer' : 'not-allowed',
          }}
        >
          {isActive ? 'Update URL' : 'Use This URL'}
        </button>
      </div>
    </div>
  );
};

// ─── Main modal ───────────────────────────────────────────────────────────────

/**
 * BackgroundModal — unified background source picker for Focus Mode.
 *
 * Props:
 *   onClose()                        — dismiss the modal
 *   onBgChange(source, customUrl?)   — called when the active source changes
 *   onRotatePhoto(targetId?)         — shuffle / jump in the curated library
 */
export const BackgroundModal = ({ onClose, onBgChange, onRotatePhoto }) => {
  const [activeSource, setActiveSource] = useState(() => getBgSource());
  const [tab, setTab] = useState(activeSource);

  // ESC closes
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const applySource = useCallback((src, customUrl) => {
    setBgSource(src);
    setActiveSource(src);
    onBgChange?.(src, customUrl ?? null);
  }, [onBgChange]);

  const handleDefaultApply = () => applySource('default');
  const handleCuratedApply = () => applySource('curated');
  const handleOrbApply = (orbId) => {
    setOrbPaletteId(orbId);
    applySource('orb');
  };
  const handleCustomApply = (url) => {
    if (url) applySource('custom', url);
    else {
      // Cleared — fall back to default if custom was active
      if (activeSource === 'custom') applySource('default');
      else setBgSource(getBgSource()); // keep current, just clear URL
    }
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Background settings"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 80, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes bgModalSpin { to { transform: rotate(360deg); } }
        @keyframes bgModalIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)   translateY(0); }
        }
        @keyframes bgFill {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes bgIndeterminate {
          0%   { transform: translateX(-100%) scaleX(0.4); }
          50%  { transform: translateX(60%) scaleX(0.8); }
          100% { transform: translateX(250%) scaleX(0.4); }
        }
        @keyframes fmOrbSpin    { to { transform: rotate(360deg); } }
        @keyframes fmOrbCounter { to { transform: rotate(-360deg); } }
        @keyframes fmOrbBloom   {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.82; transform: scale(1.13); }
        }
      `}</style>

      <div
        className="flex flex-col w-[480px] max-w-[calc(100vw-24px)] rounded-2xl overflow-hidden"
        style={{
          maxHeight: 'calc(100vh - 48px)',
          background: 'var(--w-surface)',
          border: '1px solid var(--w-border)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          animation: 'bgModalIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid var(--w-border)' }}
        >
          <span
            className="text-sm font-semibold"
            style={{ color: 'var(--w-ink-1)', letterSpacing: '-0.01em' }}
          >
            Choose Background
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full focus:outline-none cursor-pointer transition-colors btn-close"
            style={{ color: 'var(--w-ink-4)' }}
            aria-label="Close"
          >
            <XLg size={11} />
          </button>
        </div>

        {/* ── Tab strip ── */}
        <div
          className="flex gap-1.5 px-5 py-4"
          style={{ borderBottom: '1px solid var(--w-border)' }}
        >
          {TABS.map(({ id, label }) => {
            const isCurrent = tab === id;
            const isActive = activeSource === id;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className="relative py-2 px-5 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer transition-all whitespace-nowrap"
                style={
                  isCurrent
                    ? { background: 'var(--w-surface-2)', color: 'var(--w-ink-1)', border: '1px solid var(--w-border)' }
                    : { background: 'transparent', color: 'var(--w-ink-4)' }
                }
              >
                {label}
                {/* Active source indicator dot */}
                {isActive && (
                  <span
                    className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full"
                    style={{ background: 'var(--w-accent)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Panel ── */}
        <div
          className="overflow-y-auto px-5 py-5"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--w-border) transparent' }}
        >
          {tab === 'orb' && (
            <OrbPanel
              isActive={activeSource === 'orb'}
              onApply={handleOrbApply}
            />
          )}
          {tab === 'default' && (
            <DefaultPanel
              isActive={activeSource === 'default'}
              onApply={handleDefaultApply}
            />
          )}
          {tab === 'curated' && (
            <CuratedPanel
              isActive={activeSource === 'curated'}
              onApply={handleCuratedApply}
              onRotatePhoto={onRotatePhoto}
            />
          )}
          {tab === 'custom' && (
            <CustomPanel
              isActive={activeSource === 'custom'}
              onApply={handleCustomApply}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};
