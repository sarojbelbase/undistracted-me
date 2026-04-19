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
import { TabRow } from './TabRow';
import {
  getPhotoLibrary,
  downloadCuratedPhotos,
  deletePhoto,
  jumpToPhotoById,
  updatePhotoColor,
  getThumbUrl,
} from '../../utilities/unsplash';
import { extractColorFromImage } from '../../utilities/favicon';

// ─── Orb colour palettes (shared + exported) ────────────────────────────────

// ─── Focus mode localStorage helpers (exported so BackgroundModal.jsx is no longer needed) ──
const CUSTOM_URL_KEY = 'fm_custom_bg_url';
export const getCustomBgUrl = () => { try { return localStorage.getItem(CUSTOM_URL_KEY) || null; } catch { return null; } };
export const setCustomBgUrl = (url) => { try { if (url) localStorage.setItem(CUSTOM_URL_KEY, url); else localStorage.removeItem(CUSTOM_URL_KEY); } catch { } };

const ORB_PALETTE_KEY = 'fm_orb_palette_id';
const getOrbPaletteId = () => { try { return localStorage.getItem(ORB_PALETTE_KEY) || 'blueberry'; } catch { return 'blueberry'; } };
export const getOrbRgb = () => {
  const id = getOrbPaletteId();
  return id === 'accent' ? null : (ORB_PALETTES.find(p => p.id === id)?.rgb || null);
};

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
    <div className="absolute inset-0 pointer-events-none"
      style={{ boxShadow: 'inset 0 0 0 2.5px var(--w-accent)', borderRadius: 'inherit' }} />
    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 9, fontWeight: 700 }}>
      <CheckLg size={9} /><span>Active</span>
    </div>
  </>
);

// ─── Solid panel (canvas only) ───────────────────────────────────────────────

const SolidPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col items-center gap-4">
    <div
      className={`w-full rounded-xl overflow-hidden relative${!isActive ? ' cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
      style={{ aspectRatio: '16/9' }}
      onClick={!isActive ? onApply : undefined}
      role={!isActive ? 'button' : undefined}
      aria-label={!isActive ? 'Use Solid' : undefined}
    >
      {/* Preview: accent-tinted page colour — mirrors App.jsx pageBg computation */}
      <div className="w-full h-full" style={{
        background: 'color-mix(in srgb, var(--w-accent) 10%, var(--w-page-bg))',
      }} />
      {isActive && <ActiveBadge />}
    </div>
    <p className="text-xs text-center" style={{ color: 'var(--w-ink-4)' }}>
      A solid tint of your current accent color.
    </p>
  </div>
);

// ─── Default panel (focus only) ──────────────────────────────────────────────

const DefaultPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col items-center gap-4">
    <div
      className={`w-full rounded-xl overflow-hidden relative${!isActive ? ' cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
      style={{ aspectRatio: '16/9', background: 'var(--panel-bg)' }}
      onClick={!isActive ? onApply : undefined}
      role={!isActive ? 'button' : undefined}
      aria-label={!isActive ? 'Use Default' : undefined}
    >
      <img src={bgImage} alt="Default background" className="w-full h-full object-cover" />
      {isActive && <ActiveBadge />}
    </div>
  </div>
);

// ─── Orb panel ───────────────────────────────────────────────────────────────

const OrbPanel = ({ isActive, onApply, scope = 'canvas' }) => {
  // Focus mode is always dark (#060608); canvas adapts to the user's theme
  const previewBg = scope === 'focus' ? '#060608' : 'var(--w-page-bg)';
  const vignetteBg = scope === 'focus'
    ? 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, rgba(6,6,8,0.55) 65%, #060608 100%)'
    : 'radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, color-mix(in srgb, var(--w-page-bg) 55%, transparent) 65%, var(--w-page-bg) 100%)';
  return (
    <div className="flex flex-col gap-4">
      {/* Mini orb preview — uses the current accent colour */}
      <div
        className={`w-full rounded-xl overflow-hidden relative select-none${!isActive ? ' cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
        style={{ aspectRatio: '16/9', background: previewBg }}
        onClick={!isActive ? () => onApply({ orbId: 'accent' }) : undefined}
        role={!isActive ? 'button' : undefined}
        aria-label={!isActive ? 'Use Color Motion' : undefined}
      >
        <div style={{ position: 'absolute', inset: 0, animation: 'bpOrbSpin 14s linear infinite', transformOrigin: '50% 50%', pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', width: '70%', height: '70%', top: '15%', left: '15%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.55) 0%, rgba(var(--w-accent-rgb),0.18) 45%, transparent 70%)', filter: 'blur(24px)', animation: 'bpOrbBloom 5s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', width: '45%', height: '45%', top: '5%', right: '5%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.32) 0%, transparent 65%)', filter: 'blur(24px)' }} />
          <div style={{ position: 'absolute', width: '40%', height: '40%', bottom: '5%', left: '5%', borderRadius: '50%', background: 'radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.20) 0%, transparent 62%)', filter: 'blur(32px)', animation: 'bpOrbCounter 9s linear infinite', transformOrigin: '50% 50%' }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: vignetteBg }} />
        {isActive && <ActiveBadge />}
      </div>
    </div>
  );
};

// ─── Curated panel ────────────────────────────────────────────────────────────

const WIPE_MS = 650;

/** Match a stored URL against a photo object using all known URL fields. */
const photoMatchesUrl = (ph, url) =>
  !!url && (ph.regular === url || ph.url === url || ph.small === url || ph.thumb === url);

// Tile action overlay — single-step: Set as Background (with spinner while prefetching).
const PILL = { display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 999, backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.32)', cursor: 'pointer', background: 'rgba(255,255,255,0.18)' };
const TileOverlay = ({ isSetting, onSet }) => {
  const pill = isSetting ? (
    <div style={{ ...PILL, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.20)', cursor: 'default' }}>
      <Spinner size={11} />
      <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 600 }}>Setting…</span>
    </div>
  ) : (
    <button className="focus:outline-none" onClick={e => { e.stopPropagation(); onSet(); }} style={PILL}>
      <CheckLg size={10} color="white" />
      <span style={{ color: 'white', fontSize: 10, fontWeight: 600 }}>Set as Background</span>
    </button>
  );
  return (
    <div
      className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${isSetting ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      style={{ background: 'rgba(0,0,0,0.30)' }}
    >
      {pill}
    </div>
  );
};

const CuratedPanel = ({ isActive, onApply, onRotatePhoto, allowRotate, isDefaultActive, onApplyDefault, initialPhotoUrl = null, scrollFadeColor = 'var(--w-surface)', dark = false }) => {
  const [allPhotos, setAllPhotos] = useState(() => getPhotoLibrary());
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // ── Active tracking (two-phase) ──────────────────────────────────────────
  // confirmedPhotoId / applyingId use _uid (session key) for React key consistency.
  const matchUid = (photos) => {
    if (!initialPhotoUrl) return null;
    const m = photos.find(p => photoMatchesUrl(p, initialPhotoUrl));
    return m ? (m._uid ?? m.id) : null;
  };
  const [confirmedPhotoId, setConfirmedPhotoId] = useState(() => matchUid(getPhotoLibrary()));
  const [applyingId, setApplyingId] = useState(null);
  const wipeTimerRef = useRef(null);

  // ── Setting state: which tile is being prefetched before apply (in-memory) ─
  const [settingId, setSettingId] = useState(null);

  // ── Thumbnail load + color tracking ─────────────────────────────────────
  const [photoColors, setPhotoColors] = useState({});
  const handleColorExtracted = useCallback((id, color) => {
    setPhotoColors(prev => ({ ...prev, [id]: color }));
    updatePhotoColor(id, color);
  }, []);
  const [loadedIds, setLoadedIds] = useState(() => new Set());
  const handleImgLoad = useCallback((id, imgEl) => {
    setLoadedIds(prev => { const next = new Set(prev); next.add(id); return next; });
    extractColorFromImage(imgEl, c => handleColorExtracted(id, c));
  }, [handleColorExtracted]);

  // ── API fetch on open ─────────────────────────────────────────────────────
  useEffect(() => {
    setFetching(true);
    setFetchError(null);
    downloadCuratedPhotos()
      .then(photos => {
        if (!photos?.length) {
          if (!getPhotoLibrary().length) setFetchError('Could not reach the server. Check your connection.');
          return;
        }
        const tagged = photos.map(p => ({
          ...p,
          _uid: (typeof crypto !== 'undefined' && crypto.randomUUID)
            ? crypto.randomUUID()
            : `${Date.now()}_${p.id}`,
        }));
        setAllPhotos(tagged);
        if (initialPhotoUrl) {
          const freshMatch = tagged.find(p => photoMatchesUrl(p, initialPhotoUrl));
          if (freshMatch) setConfirmedPhotoId(freshMatch._uid);
        }
      })
      .catch(() => { if (!getPhotoLibrary().length) setFetchError('Something went wrong. Please try again.'); })
      .finally(() => setFetching(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => { if (wipeTimerRef.current) clearTimeout(wipeTimerRef.current); }, []);

  // ── Set a photo as background: prefetch full-res then apply with wipe ───────
  const handleSetBackground = useCallback((uid) => {
    if (uid === confirmedPhotoId && isActive) return;
    if (uid === applyingId || uid === settingId) return;
    const photo = allPhotos.find(p => (p._uid ?? p.id) === uid);
    if (!photo) return;

    const doApply = () => {
      setSettingId(null);
      clearTimeout(wipeTimerRef.current);
      setApplyingId(uid);
      // Pass full photo object so it's inserted into cache even if it was
      // beyond LIBRARY_MAX and got sliced out during the API write.
      jumpToPhotoById(photo.id, photo);
      wipeTimerRef.current = setTimeout(async () => {
        if (allowRotate) {
          await onRotatePhoto?.(photo.id, photo);
          onApply();
        } else {
          const url = photo.regular || photo.url || photo.small || null;
          onApply(url, photoColors[uid] ?? null);
        }
        setConfirmedPhotoId(uid);
        setApplyingId(null);
      }, WIPE_MS);
    };

    const src = photo.regular || photo.url || photo.small;
    if (!src) { doApply(); return; }

    setSettingId(uid);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = doApply;
    img.onerror = doApply;
    img.src = src;
  }, [confirmedPhotoId, isActive, applyingId, settingId, allPhotos, allowRotate, onRotatePhoto, onApply, photoColors]);

  // ── Delete a photo ────────────────────────────────────────────────────────
  const handleDelete = async (uid) => {
    const photo = allPhotos.find(p => (p._uid ?? p.id) === uid);
    if (!photo) return;
    if (uid === applyingId) { clearTimeout(wipeTimerRef.current); setApplyingId(null); }
    if (uid === settingId) setSettingId(null);
    const wasActive = uid === confirmedPhotoId;
    deletePhoto(photo.id);
    setAllPhotos(prev => prev.filter(p => (p._uid ?? p.id) !== uid));
    if (wasActive) {
      const nextState = allPhotos.find(p => (p._uid ?? p.id) !== uid);
      const next = nextState ?? getPhotoLibrary()[0];
      const nextUrl = next ? (next.regular || next.url || next.small || null) : null;
      if (next && nextUrl) {
        jumpToPhotoById(next.id);
        if (allowRotate) { await onRotatePhoto?.(next.id, next); onApply(); }
        else onApply(nextUrl);
        setConfirmedPhotoId(next._uid ?? next.id);
      } else {
        onApplyDefault?.();
        setConfirmedPhotoId(null);
      }
    }
  };

  const activeId = isActive ? confirmedPhotoId : null;
  const showShimmers = fetching && allPhotos.length === 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Indeterminate bar while fetching the photo list */}
      {fetching && (
        <div style={{ height: 3, borderRadius: 2, overflow: 'hidden', background: dark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)' }}>
          <div style={{ height: '100%', borderRadius: 2, width: '40%', background: 'var(--w-accent)', animation: 'bpIndeterminate 1.4s cubic-bezier(0.4,0,0.6,1) infinite' }} />
        </div>
      )}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 overflow-y-auto"
          style={{ maxHeight: 248, scrollbarWidth: 'none', pointerEvents: fetching ? 'none' : undefined }}>

          {/* Cell 0: Built-in bg.webp — always directly applicable, no Download step */}
          <button
            className="relative rounded-lg overflow-hidden cursor-pointer group focus:outline-none"
            style={{ aspectRatio: '4/3', display: 'block', padding: 0, border: 'none' }}
            onClick={onApplyDefault}
            aria-label="Use built-in background"
          >
            <img src={bgImage} alt="" aria-hidden decoding="async" className="w-full h-full object-cover" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ background: 'rgba(0,0,0,0.28)' }} />
            {isDefaultActive && <ActiveBadge />}
            <div className="absolute bottom-1 left-1 pointer-events-none">
              <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.52)', color: '#fff', letterSpacing: '0.06em' }}>Default</span>
            </div>
          </button>

          {/* Curated photo tiles */}
          {allPhotos.map((ph) => {
            const uid = ph._uid ?? ph.id;
            const thumbSrc = getThumbUrl(ph) || ph.small || ph.url || ph.regular;
            const isPhotoActive = uid === activeId;
            const isApplying = uid === applyingId;
            const isLoaded = loadedIds.has(ph.id);
            const isSetting = settingId === uid;
            return (
              <div
                key={uid}
                className="relative rounded-lg overflow-hidden group"
                style={{
                  aspectRatio: '4/3',
                  background: photoColors[ph.id] || ph.color || (dark ? '#1a1a1e' : 'var(--panel-bg)'),
                  opacity: fetching ? 0.55 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
                {/* Thumbnail — dominant color → blurred → sharp via CSS transition */}
                <img
                  src={thumbSrc}
                  alt=""
                  aria-hidden
                  decoding="async"
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                  style={{
                    filter: isLoaded ? 'none' : 'blur(10px)',
                    transform: isLoaded ? 'scale(1)' : 'scale(1.1)',
                    opacity: isLoaded ? 1 : 0.72,
                    transition: 'filter 0.45s ease, transform 0.45s ease, opacity 0.3s ease',
                  }}
                  onLoad={e => handleImgLoad(ph.id, e.currentTarget)}
                />

                {/* Shimmer — visible only before thumbnail starts rendering */}
                {!isLoaded && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: dark
                        ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)'
                        : 'linear-gradient(90deg, rgba(0,0,0,0.04) 0%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.04) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s ease-in-out infinite',
                    }}
                  />
                )}

                {/* Wipe sweep while applying */}
                {isApplying && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0.0) 100%)',
                      animation: `bpWipe ${WIPE_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
                    }}
                  />
                )}

                {/* Active badge */}
                {isPhotoActive && <ActiveBadge />}

                {/* Hover overlay: Set as Background (with spinner while prefetching) */}
                {!isPhotoActive && !isApplying && isLoaded && !fetching && (
                  <TileOverlay
                    isSetting={isSetting}
                    onSet={() => handleSetBackground(uid)}
                  />
                )}

                {/* Delete button */}
                <button
                  onClick={() => handleDelete(uid)}
                  className="absolute top-1 right-1 z-10 w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity btn-close focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid transparent' }}
                  aria-label="Remove photo"
                >
                  <XLg size={7} />
                </button>
              </div>
            );
          })}

          {/* Shimmer placeholders while fetching on first open */}
          {showShimmers && Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`shimmer-${i}`}
              className="relative rounded-lg overflow-hidden"
              style={{
                aspectRatio: '4/3',
                background: dark ? 'rgba(255,255,255,0.06)' : 'var(--panel-bg)',
                border: dark ? '1px solid rgba(255,255,255,0.10)' : '1px solid var(--card-border)',
              }}
            >
              <div className="absolute inset-0" style={{
                background: dark
                  ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)'
                  : 'linear-gradient(90deg, var(--panel-bg) 0%, var(--card-border) 50%, var(--panel-bg) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>
        {/* Scroll-hint fade */}
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-lg" style={{ background: `linear-gradient(to bottom, transparent, ${scrollFadeColor})` }} />
      </div>

      {fetchError && (
        <p className="text-[10px] font-medium text-center px-2 py-1.5 rounded-lg" style={dark
          ? { background: 'rgba(239,68,68,0.14)', color: 'rgb(252,129,129)', border: '1px solid rgba(239,68,68,0.32)' }
          : { background: 'rgba(239,68,68,0.08)', color: 'rgb(185,28,28)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {fetchError}
        </p>
      )}
    </div>
  );
};

// ─── Custom URL panel ─────────────────────────────────────────────────────────

const CustomPanel = ({ isActive, initialCustomUrl, onApply, dark = false }) => {
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
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold" style={{ color: dark ? 'rgba(255,255,255,0.65)' : 'var(--w-ink-3)' }} htmlFor="bpUrlInput">
          Image URL
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SettingsInput ref={inputRef} id="bpUrlInput" name="bpUrlInput" type="url" value={value} dark={dark}
              onChange={(e) => { setValue(e.target.value); setStatus('idle'); setPreviewUrl(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              placeholder="https://buymemomo.com/sarojbelbase"
              autoComplete="off" spellCheck={false}
              icon={<Link45deg size={13} />}
              suffix={<UrlVerifySuffix status={status} />}
            />
          </div>
          <button onClick={verify} disabled={!syntaxOk || status === 'checking'}
            className="px-3.5 py-2 rounded-xl text-[11px] font-semibold focus:outline-none disabled:opacity-40 shrink-0 cursor-pointer"
            style={dark
              ? { background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)' }
              : { background: 'var(--panel-bg)', border: '1px solid var(--card-border)', color: 'var(--w-ink-2)' }}>
            Verify
          </button>
        </div>
        {hint && !errorMsg && <p className="text-xs" style={{ color: dark ? 'rgba(251,191,36,0.95)' : 'rgba(161,118,0,0.9)' }}>{hint}</p>}
        {errorMsg && <p className="text-xs font-medium" style={{ color: dark ? 'rgba(252,129,129,1)' : 'rgba(220,38,38,0.9)' }}>{errorMsg}</p>}
      </div>

      {previewUrl && (
        <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: dark ? 'rgba(255,255,255,0.06)' : 'var(--panel-bg)' }}>
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" style={{ opacity: status === 'ok' ? 1 : 0.5 }} />
        </div>
      )}

      <div className="flex gap-2">
        {initialCustomUrl && (
          <button onClick={handleClear}
            className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none"
            style={dark
              ? { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.78)' }
              : { background: 'var(--panel-bg)', border: '1px solid var(--card-border)', color: 'var(--w-ink-3)' }}>
            Clear
          </button>
        )}
        <button onClick={handleApply} disabled={!value.trim()}
          className="flex-1 py-2 rounded-xl text-xs font-semibold focus:outline-none disabled:opacity-40 cursor-pointer"
          style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', cursor: value.trim() ? 'pointer' : 'not-allowed' }}>
          {isActive ? 'Update URL' : 'Use This URL'}
        </button>
      </div>
    </div>
  );
};

// ─── Tab config per scope ─────────────────────────────────────────────────────
// Canvas: only solid + orb (photos/URL live in the canvas widget grid).
// Focus: photos from curated library and custom URL. Default (bg.webp) is accessible via the "Built-in" cell in Photos tab.

const CANVAS_TABS = [
  { id: 'solid', label: 'Solid', hint: 'Accent tint, no motion' },
  { id: 'orb', label: 'Motion', hint: 'Animated color orb' },
];

const FOCUS_TABS = [
  { id: 'curated', label: 'Photos' },
  { id: 'custom', label: 'URL' },
];

// ─── Main BackgroundPicker modal ──────────────────────────────────────────────

// ─── Suffix icon for URL verify status ──────────────────────────────────────
const UrlVerifySuffix = ({ status }) => {
  if (status === 'ok') return <CheckLg size={12} style={{ color: 'rgb(34,197,94)', marginRight: 4, flexShrink: 0 }} />;
  if (status === 'checking') return <span style={{ marginRight: 4 }}><Spinner size={12} /></span>;
  return null;
};

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

  const dark = scope === 'focus';
  const tabs = scope === 'focus' ? FOCUS_TABS : CANVAS_TABS;

  // Ensure the initial active tab exists in the current scope's tab list.
  // e.g. if canvas bg was 'curated' and we open the canvas picker (which no longer has curated),
  // fall back to the first canvas tab.
  const resolvedTab = tabs.find(t => t.id === tab)?.id ?? tabs[0].id;

  // Theme tokens — dark glass for focus, surface tokens for canvas.
  const cardSurface = dark ? 'rgb(12,12,16)' : 'var(--w-surface)';
  const th = dark
    ? {
      cardBg: 'rgba(12,12,16,0.86)',
      cardBdFilter: 'blur(24px) saturate(160%)',
      cardBorder: 'rgba(255,255,255,0.11)',
      cardShadow: '0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)',
      divider: 'rgba(255,255,255,0.10)',
      title: 'rgba(255,255,255,0.92)',
      sub: 'rgba(255,255,255,0.42)',
      closeBtn: 'rgba(255,255,255,0.42)',
    }
    : {
      cardBg: 'var(--w-surface)',
      cardBdFilter: undefined,
      cardBorder: 'var(--card-border)',
      cardShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      divider: 'var(--card-border)',
      title: 'var(--w-ink-1)',
      sub: 'var(--w-ink-4)',
      closeBtn: 'var(--w-ink-4)',
    };

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
    <dialog
      open
      aria-modal="true"
      aria-label="Background settings"
      tabIndex={-1}
      className="fixed inset-0 m-0 p-0 max-w-none max-h-none border-0 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', zIndex: 90 }}
    >
      <style>{`
        @keyframes bpSpin          { to { transform: rotate(360deg); } }
        @keyframes bpOrbSpin       { to { transform: rotate(360deg); } }
        @keyframes bpOrbCounter    { to { transform: rotate(-360deg); } }
        @keyframes bpOrbBloom      { 0%,100%{opacity:1;transform:scale(1)}50%{opacity:.78;transform:scale(1.18)} }
        @keyframes bpIn            { from{opacity:0;transform:scale(.97) translateY(8px)} to{opacity:1;transform:none} }
        @keyframes bpIndeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(400%)} }
        @keyframes bpWipe          { from{transform:translateX(-100%)} to{transform:translateX(100%)} }
        @keyframes shimmer         { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>

      <div
        className="flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: th.cardBg,
          backdropFilter: th.cardBdFilter,
          WebkitBackdropFilter: th.cardBdFilter,
          border: `1px solid ${th.cardBorder}`,
          boxShadow: th.cardShadow ?? '0 25px 50px -12px rgba(0,0,0,0.25)',
          width: 480,
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)',
          animation: 'bpIn 0.22s cubic-bezier(.32,.72,0,1) both',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 shrink-0"
          style={{ borderBottom: `1px solid ${th.divider}` }}>
          <div>
            <h2 className="font-semibold text-sm" style={{ color: th.title }}>
              {scope === 'focus' ? 'Focus Mode Background' : 'Canvas Background'}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: th.sub }}>
              Choose how your {scope === 'focus' ? 'focus screen' : 'home canvas'} looks
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="w-7 h-7 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer focus:outline-none"
            style={{ color: th.closeBtn }}>
            <XLg size={13} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-5 pt-4 shrink-0">
          <TabRow tabs={tabs} value={resolvedTab} onChange={setTab} dark={dark} />
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
              scope={scope}
            />
          )}
          {resolvedTab === 'curated' && (
            <CuratedPanel
              isActive={activeSource === 'curated'}
              isDefaultActive={activeSource === 'default'}
              allowRotate={scope === 'focus'}
              initialPhotoUrl={initialPhotoUrl}
              onApply={(url, color) => handleApply('curated', url ? { url, ...(color ? { color } : {}) } : {})}
              onApplyDefault={() => handleApply('default')}
              onRotatePhoto={onRotatePhoto}
              scrollFadeColor={cardSurface}
              dark={dark}
            />
          )}
          {resolvedTab === 'custom' && (
            <CustomPanel
              isActive={activeSource === 'custom'}
              initialCustomUrl={initialCustomUrl}
              dark={dark}
              onApply={(opts) => {
                if (opts.url) handleApply('custom', opts);
                else if (activeSource === 'custom') handleApply(scope === 'focus' ? 'default' : 'solid', {});
              }}
            />
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
};
