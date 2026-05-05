/**
 * Background — FocusMode background settings tab.
 * Self-contained: curated photo grid + custom URL input.
 * Dark glass style throughout — no dependency on BackgroundPicker.jsx.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { XLg, Link45deg, CheckLg } from 'react-bootstrap-icons';
import bgImage from '../../../assets/img/bg.webp';
import { SettingsInput } from '../../ui/SettingsInput';
import { TabRow } from '../../ui/TabRow';
import {
  getPhotoLibrary,
  downloadCuratedPhotos,
  deletePhoto,
  jumpToPhotoById,
  updatePhotoColor,
  getThumbUrl,
} from '../../../utilities/unsplash';
import { extractColorFromImage } from '../../../utilities/favicon';
import { GLASS_CARD_BG } from '../theme';

// ─── Tab config ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'curated', label: 'Photos' },
  { id: 'custom', label: 'URL' },
];

// ─── URL validation ───────────────────────────────────────────────────────────────────────

const VALID_HTTPS = /^https?:\/\/.+/i;
const VALID_EXT = /^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;
const classifyUrl = (raw) => {
  const s = raw.trim();
  if (!s) return { ok: false, hint: null };
  if (VALID_EXT.test(s)) return { ok: true, hint: null };
  if (VALID_HTTPS.test(s)) return { ok: true, hint: 'No image extension detected — will verify on Apply.' };
  return { ok: false, hint: 'Must be a valid https:// URL.' };
};

// ─── Spinner ───────────────────────────────────────────────────────────────────────────────

const Spinner = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    style={{ animation: 'bpSpin 0.75s linear infinite', flexShrink: 0 }} aria-hidden>
    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.18)" strokeWidth="2.2" />
    <path d="M8 2 A6 6 0 0 1 14 8" stroke="rgba(255,255,255,0.7)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ─── Active badge ─────────────────────────────────────────────────────────────────────────

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

// ─── URL verify suffix ────────────────────────────────────────────────────────────────────

const UrlVerifySuffix = ({ status }) => {
  if (status === 'ok') return <CheckLg size={12} style={{ color: 'rgb(34,197,94)', marginRight: 4, flexShrink: 0 }} />;
  if (status === 'checking') return <span style={{ marginRight: 4 }}><Spinner size={12} /></span>;
  return null;
};

// ─── Tile action overlay ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────────────────────

const WIPE_MS = 650;
const photoMatchesUrl = (ph, url) =>
  !!url && (ph.regular === url || ph.url === url || ph.small === url || ph.thumb === url);

// ─── Curated photos panel ────────────────────────────────────────────────────────────────────

const CuratedPanel = ({ isActive, isDefaultActive, onApply, onApplyDefault, onRotatePhoto, initialPhotoUrl = null }) => {
  const [allPhotos, setAllPhotos] = useState(() => getPhotoLibrary());
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  const matchUid = (photos) => {
    if (!initialPhotoUrl) return null;
    const m = photos.find(p => photoMatchesUrl(p, initialPhotoUrl));
    return m ? (m._uid ?? m.id) : null;
  };
  const [confirmedPhotoId, setConfirmedPhotoId] = useState(() => matchUid(getPhotoLibrary()));
  const [applyingId, setApplyingId] = useState(null);
  const wipeTimerRef = useRef(null);
  const [settingId, setSettingId] = useState(null);
  const [photoColors, setPhotoColors] = useState({});
  const [loadedIds, setLoadedIds] = useState(() => new Set());

  const handleColorExtracted = useCallback((id, color) => {
    setPhotoColors(prev => ({ ...prev, [id]: color }));
    updatePhotoColor(id, color);
  }, []);

  const handleImgLoad = useCallback((id, imgEl) => {
    setLoadedIds(prev => { const next = new Set(prev); next.add(id); return next; });
    extractColorFromImage(imgEl, c => handleColorExtracted(id, c));
  }, [handleColorExtracted]);

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

  const handleSetBackground = useCallback((uid) => {
    if (uid === confirmedPhotoId && isActive) return;
    if (uid === applyingId || uid === settingId) return;
    const photo = allPhotos.find(p => (p._uid ?? p.id) === uid);
    if (!photo) return;

    const doApply = () => {
      setSettingId(null);
      clearTimeout(wipeTimerRef.current);
      setApplyingId(uid);
      jumpToPhotoById(photo.id, photo);
      wipeTimerRef.current = setTimeout(async () => {
        await onRotatePhoto?.(photo.id, photo);
        onApply();
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
  }, [confirmedPhotoId, isActive, applyingId, settingId, allPhotos, onRotatePhoto, onApply]);

  const handleDelete = async (uid) => {
    const photo = allPhotos.find(p => (p._uid ?? p.id) === uid);
    if (!photo) return;
    if (uid === applyingId) { clearTimeout(wipeTimerRef.current); setApplyingId(null); }
    if (uid === settingId) setSettingId(null);
    const wasActive = uid === confirmedPhotoId;
    deletePhoto(photo.id);
    setAllPhotos(prev => prev.filter(p => (p._uid ?? p.id) !== uid));
    if (wasActive) {
      const next = allPhotos.find(p => (p._uid ?? p.id) !== uid) ?? getPhotoLibrary()[0];
      if (next) {
        jumpToPhotoById(next.id);
        await onRotatePhoto?.(next.id, next);
        onApply();
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
      {fetching && (
        <div style={{ height: 3, borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.10)' }}>
          <div style={{ height: '100%', borderRadius: 2, width: '40%', background: 'var(--w-accent)', animation: 'bpIndeterminate 1.4s cubic-bezier(0.4,0,0.6,1) infinite' }} />
        </div>
      )}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 overflow-y-auto"
          style={{ maxHeight: 248, scrollbarWidth: 'none', pointerEvents: fetching ? 'none' : undefined }}>

          {/* Built-in default */}
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
                  background: photoColors[ph.id] || ph.color || '#1a1a1e',
                  opacity: fetching ? 0.55 : 1,
                  transition: 'opacity 0.3s',
                }}
              >
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
                {!isLoaded && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.4s ease-in-out infinite',
                    }}
                  />
                )}
                {isApplying && (
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.0) 0%, rgba(255,255,255,0.38) 50%, rgba(255,255,255,0.0) 100%)',
                      animation: `bpWipe ${WIPE_MS}ms cubic-bezier(0.4,0,0.2,1) forwards`,
                    }}
                  />
                )}
                {isPhotoActive && <ActiveBadge />}
                {!isPhotoActive && !isApplying && isLoaded && !fetching && (
                  <TileOverlay isSetting={isSetting} onSet={() => handleSetBackground(uid)} />
                )}
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

          {showShimmers && Array.from({ length: 6 }).map((_, i) => (
            <div
              key={`shimmer-slot-${i}`} /* NOSONAR: static placeholder list, order never changes */
              className="relative rounded-lg overflow-hidden"
              style={{ aspectRatio: '4/3', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)' }}
            >
              <div className="absolute inset-0" style={{
                background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.4s ease-in-out infinite',
              }} />
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none rounded-b-lg"
          style={{ background: `linear-gradient(to bottom, transparent, ${GLASS_CARD_BG})` }} />
      </div>
      {fetchError && (
        <p className="text-[10px] font-medium text-center px-2 py-1.5 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.14)', color: 'rgb(252,129,129)', border: '1px solid rgba(239,68,68,0.32)' }}>
          {fetchError}
        </p>
      )}
    </div>
  );
};

// ─── Custom URL panel ────────────────────────────────────────────────────────────────────

const CustomPanel = ({ isActive, initialCustomUrl, onApply }) => {
  const [value, setValue] = useState(initialCustomUrl || '');
  const [status, setStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);

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
  const handleClear = () => { setValue(''); setPreviewUrl(null); setStatus('idle'); onApply({ url: null }); };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.65)' }} htmlFor="fmUrlInput">
          Image URL
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <SettingsInput ref={inputRef} id="fmUrlInput" name="fmUrlInput" type="url" value={value} dark
              onChange={(e) => { setValue(e.target.value); setStatus('idle'); setPreviewUrl(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              placeholder="https://example.com/photo.jpg"
              autoComplete="off" spellCheck={false}
              icon={<Link45deg size={13} />}
              suffix={<UrlVerifySuffix status={status} />}
            />
          </div>
          <button onClick={verify} disabled={!syntaxOk || status === 'checking'}
            className="px-3.5 py-2 rounded-xl text-[11px] font-semibold focus:outline-none disabled:opacity-40 shrink-0 cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.18)', color: 'rgba(255,255,255,0.85)' }}>
            Verify
          </button>
        </div>
        {hint && !errorMsg && <p className="text-xs" style={{ color: 'rgba(251,191,36,0.95)' }}>{hint}</p>}
        {errorMsg && <p className="text-xs font-medium" style={{ color: 'rgba(252,129,129,1)' }}>{errorMsg}</p>}
      </div>
      {previewUrl && (
        <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'rgba(255,255,255,0.06)' }}>
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" style={{ opacity: status === 'ok' ? 1 : 0.5 }} />
        </div>
      )}
      <div className="flex gap-2">
        {initialCustomUrl && (
          <button onClick={handleClear}
            className="flex-1 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.78)' }}>
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

// ─── Main export ──────────────────────────────────────────────────────────────────────────────

export const Background = ({ initialSource, initialCustomUrl, initialPhotoUrl, onApply, onRotatePhoto }) => {
  const [activeSource, setActiveSource] = useState(initialSource ?? 'default');
  const [tab, setTab] = useState(() => initialSource === 'custom' ? 'custom' : 'curated');

  const handleApply = useCallback((type, opts = {}) => {
    setActiveSource(type);
    onApply?.(type, opts);
  }, [onApply]);

  return (
    <div className="flex flex-col gap-3">
      <TabRow tabs={TABS} value={tab} onChange={setTab} dark />
      <div>
        {tab === 'curated' && (
          <CuratedPanel
            isActive={activeSource === 'curated'}
            isDefaultActive={activeSource === 'default'}
            initialPhotoUrl={initialPhotoUrl}
            onApply={(url, color) => handleApply('curated', url ? { url, ...(color ? { color } : {}) } : {})}
            onApplyDefault={() => handleApply('default')}
            onRotatePhoto={onRotatePhoto}
          />
        )}
        {tab === 'custom' && (
          <CustomPanel
            isActive={activeSource === 'custom'}
            initialCustomUrl={initialCustomUrl}
            onApply={(opts) => {
              if (opts.url) handleApply('custom', opts);
              else if (activeSource === 'custom') handleApply('default', {});
            }}
          />
        )}
      </div>
    </div>
  );
};
