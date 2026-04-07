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

// ─── Segment control ──────────────────────────────────────────────────────────

const TABS = [
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
          <div className="grid grid-cols-3 gap-1.5">
            {library.map((ph, i) => {
              const isHead = i === 0;
              return (
                <div
                  key={ph.id}
                  className="relative group rounded-lg overflow-hidden cursor-pointer"
                  style={{ aspectRatio: '16/9' }}
                  onClick={() => handleUse(ph.id)}
                >
                  <img
                    src={ph.small}
                    alt={ph.id}
                    className="w-full h-full object-cover transition-opacity duration-150"
                    style={{ opacity: isHead ? 1 : 0.55 }}
                  />

                  {/* Active ring */}
                  {isHead && isActive && (
                    <div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{ boxShadow: 'inset 0 0 0 2px var(--w-accent)' }}
                    />
                  )}

                  {/* Hover overlay */}
                  <div
                    className="absolute inset-0 flex items-end justify-between p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 60%, transparent)' }}
                  >
                    {(!isHead || !isActive) && (
                      <span
                        className="text-[7px] font-bold leading-none px-1.5 py-0.5 rounded-sm"
                        style={{ background: 'var(--w-accent)', color: '#fff' }}
                      >
                        USE
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(ph.id); }}
                      className="ml-auto text-[9px] leading-none px-1 py-0.5 rounded focus:outline-none"
                      style={{ background: 'rgba(0,0,0,0.5)', color: 'rgba(255,255,255,0.7)' }}
                      title="Remove from library"
                    >
                      ✕
                    </button>
                  </div>
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
            className="w-7 h-7 flex items-center justify-center rounded-full focus:outline-none cursor-pointer transition-all"
            style={{ color: 'var(--w-ink-4)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = 'rgba(239,68,68,0.9)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--w-ink-4)'; }}
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
