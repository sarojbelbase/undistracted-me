/**
 * CanvasBackgroundPicker — canvas-aware curated photo grid + custom URL input.
 *
 * Rendered inside the canvas Appearance tab when the Background segment is set
 * to Photos (`canvasBg.type === 'photo'`) or Custom URL (`canvasBg.type ===
 * 'custom'`). Reuses the shared curated photo library (read-only — canvas and
 * Focus Mode keep independent selections) and the canvas `Input` primitive;
 * styled with `--w-*` tokens so it follows light/dark mode.
 *
 * Props:
 *   type      'photo' | 'custom' — which sub-panel to render
 *   value     current canvasBg object
 *   onChange  (nextCanvasBg) => void
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Link45deg, CheckLg } from 'react-bootstrap-icons';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  getPhotoLibrary,
  downloadCuratedPhotos,
  getThumbUrl,
} from '../../utilities/unsplash';

// ─── URL validation (mirrors Focus Mode's Background.jsx) ──────────────────────

const VALID_HTTPS = /^https?:\/\/.+/i;
const VALID_EXT = /^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;
const classifyUrl = (raw) => {
  const s = raw.trim();
  if (!s) return { ok: false, hint: null };
  if (VALID_EXT.test(s)) return { ok: true, hint: null };
  if (VALID_HTTPS.test(s)) return { ok: true, hint: 'No image extension detected — will verify on Apply.' };
  return { ok: false, hint: 'Must be a valid https:// URL.' };
};

// ─── Spinner ───────────────────────────────────────────────────────────────────

const Spinner = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
    style={{ animation: 'bpSpin 0.75s linear infinite', flexShrink: 0 }} aria-hidden>
    <circle cx="8" cy="8" r="6" stroke="var(--card-border)" strokeWidth="2.2" />
    <path d="M8 2 A6 6 0 0 1 14 8" stroke="var(--w-accent)" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

// ─── Active badge ──────────────────────────────────────────────────────────────

const ActiveBadge = () => (
  <>
    <div className="absolute inset-0 pointer-events-none"
      style={{ boxShadow: 'inset 0 0 0 2px var(--w-accent)', borderRadius: 'inherit' }} />
    <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)', fontSize: 9, fontWeight: 700 }}>
      <CheckLg size={9} /><span>Active</span>
    </div>
  </>
);

const photoMatchesUrl = (ph, url) =>
  !!url && (ph.regular === url || ph.url === url || ph.small === url || ph.thumb === url);

const photoUrl = (ph) => ph.regular || ph.url || ph.small || ph.thumb;

// ─── Curated photos grid ───────────────────────────────────────────────────────

// Holds its own `loaded` flag so a single image finishing load re-renders only
// that tile — not the whole grid. The previous grid-level `loadedIds` Set made
// every staggered lazy-load repaint all ~20 tiles, which is what made the panel
// feel laggy while scrolling.
const PhotoTile = ({ photo, active, dimmed, onSelect }) => {
  const [loaded, setLoaded] = useState(false);
  const thumbSrc = getThumbUrl(photo) || photo.small || photo.url || photo.regular;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label="Set as background"
      aria-pressed={active}
      className="relative rounded-lg overflow-hidden group"
      style={{
        aspectRatio: '4/3',
        display: 'block',
        padding: 0,
        border: 'none',
        cursor: 'pointer',
        background: photo.color || 'var(--panel-bg)',
        opacity: dimmed ? 0.55 : 1,
        transition: 'opacity 0.3s',
      }}
    >
      <img
        src={thumbSrc}
        alt=""
        aria-hidden
        decoding="async"
        loading="lazy"
        crossOrigin="anonymous"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          filter: loaded ? 'none' : 'blur(10px)',
          transform: loaded ? 'scale(1)' : 'scale(1.1)',
          opacity: loaded ? 1 : 0.72,
          transition: 'filter 0.45s ease, transform 0.45s ease, opacity 0.3s ease',
        }}
        onLoad={() => setLoaded(true)}
      />
      {!loaded && (
        <div className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.4s ease-in-out infinite',
          }} />
      )}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-150"
        style={{ background: 'rgba(0,0,0,0.28)' }}>
        <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: 'rgba(0,0,0,0.55)', color: '#fff', backdropFilter: 'blur(4px)' }}>
          <CheckLg size={10} /> Set as Background
        </span>
      </div>
      {active && <ActiveBadge />}
    </button>
  );
};

const PhotoGrid = ({ value, onChange }) => {
  const [allPhotos, setAllPhotos] = useState(() => getPhotoLibrary());
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    let alive = true;
    setFetching(true);
    setFetchError(null);
    downloadCuratedPhotos()
      .then((photos) => {
        if (!alive) return;
        if (photos?.length) {
          // `id` is stable across fetches (Unsplash id), so keying by it keeps
          // browser image-cache + React reconciliation intact between opens. A
          // random per-fetch `_uid` was remounting every tile (re-blurring and
          // re-extracting colours on every open).
          setAllPhotos(photos);
        } else if (!getPhotoLibrary().length) {
          setFetchError('Could not reach the server. Check your connection.');
        }
      })
      .catch(() => {
        if (alive && !getPhotoLibrary().length) setFetchError('Something went wrong. Please try again.');
      })
      .finally(() => { if (alive) setFetching(false); });
    return () => { alive = false; };
  }, []);

  const activeId = value?.type === 'photo' ? value.photoId : null;

  const handleSelect = (id) => {
    const photo = allPhotos.find((p) => p.id === id);
    if (!photo) return;
    onChange({
      type: 'photo',
      url: photoUrl(photo) || null,
      photoId: photo.id,
      color: photo.color || null,
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {fetching && (
        <div style={{ height: 3, borderRadius: 2, overflow: 'hidden', background: 'var(--panel-bg)' }}>
          <div style={{
            height: '100%', borderRadius: 2, width: '40%', background: 'var(--w-accent)',
            animation: 'bpIndeterminate 1.4s cubic-bezier(0.4,0,0.6,1) infinite',
          }} />
        </div>
      )}
      <div className="grid grid-cols-3 gap-1.5 overflow-y-auto"
        style={{ maxHeight: 220, scrollbarWidth: 'none', pointerEvents: fetching ? 'none' : undefined }}>
        {allPhotos.map((ph) => (
          <PhotoTile
            key={ph.id}
            photo={ph}
            active={activeId != null && (ph.id === activeId || photoMatchesUrl(ph, value?.url))}
            dimmed={fetching}
            onSelect={() => handleSelect(ph.id)}
          />
        ))}
        {fetching && allPhotos.length === 0 && Array.from({ length: 6 }).map((_, i) => (
          <div key={`shimmer-slot-${i}`} className="relative rounded-lg overflow-hidden"
            style={{ aspectRatio: '4/3', background: 'var(--panel-bg)' }}>
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.4s ease-in-out infinite',
            }} />
          </div>
        ))}
      </div>
      {fetchError && (
        <p className="text-[10px] font-medium text-center px-2 py-1.5 rounded-lg"
          style={{ background: 'rgba(239,68,68,0.14)', color: 'rgb(220,38,38)', border: '1px solid rgba(239,68,68,0.32)' }}>
          {fetchError}
        </p>
      )}
    </div>
  );
};

// ─── Custom URL panel ──────────────────────────────────────────────────────────

const UrlVerifySuffix = ({ status }) => {
  if (status === 'ok') return <CheckLg size={12} style={{ color: 'rgb(34,197,94)', marginRight: 4, flexShrink: 0 }} />;
  if (status === 'checking') return <span style={{ marginRight: 4 }}><Spinner size={12} /></span>;
  return null;
};

const CustomUrlPanel = ({ value, onChange }) => {
  const [text, setText] = useState(value?.url || '');
  const [status, setStatus] = useState('idle');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);
  const verifyTimerRef = useRef(null);
  const verifyImgRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  // Clear any in-flight verification (5s timeout + image load) on unmount so its
  // handlers can't setState after the panel is gone.
  useEffect(() => () => {
    clearTimeout(verifyTimerRef.current);
    if (verifyImgRef.current) verifyImgRef.current.src = '';
  }, []);

  const { ok: syntaxOk, hint } = classifyUrl(text);

  const verify = useCallback(() => {
    const url = text.trim();
    if (!classifyUrl(url).ok) { setErrorMsg('Enter an https:// image URL to continue.'); setStatus('error'); return; }
    setStatus('checking'); setPreviewUrl(null); setErrorMsg('');
    const img = new globalThis.Image();
    verifyImgRef.current = img;
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => { img.src = ''; setPreviewUrl(url); setStatus('ok'); }, 5000);
    verifyTimerRef.current = timeout;
    img.onload = () => { clearTimeout(timeout); setPreviewUrl(url); setStatus('ok'); };
    img.onerror = () => { clearTimeout(timeout); setPreviewUrl(url); setStatus('ok'); setErrorMsg('Could not verify — the URL may still work.'); };
    img.src = url;
  }, [text]);

  const handleApply = () => {
    const url = text.trim();
    if (!url || !classifyUrl(url).ok) return;
    onChange({ type: 'custom', url });
  };
  const handleClear = () => {
    setText('');
    setPreviewUrl(null);
    setStatus('idle');
    onChange({ type: 'solid', orbId: null });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }} htmlFor="canvasBgUrlInput">
          Image URL
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1">
            <Input pill ref={inputRef} id="canvasBgUrlInput" name="canvasBgUrlInput" type="url" value={text}
              onChange={(e) => { setText(e.target.value); setStatus('idle'); setPreviewUrl(null); setErrorMsg(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') verify(); }}
              placeholder="https://example.com/photo.jpg"
              autoComplete="off" spellCheck={false}
              icon={<Link45deg size={13} />}
              suffix={<UrlVerifySuffix status={status} />}
            />
          </div>
          <Button onClick={verify} disabled={!syntaxOk || status === 'checking'} variant="secondary" size="sm">
            Verify
          </Button>
        </div>
        {hint && !errorMsg && <p className="text-xs" style={{ color: 'var(--w-ink-5)' }}>{hint}</p>}
        {errorMsg && <p className="text-xs font-medium" style={{ color: 'rgb(220,38,38)' }}>{errorMsg}</p>}
      </div>
      {previewUrl && (
        <div className="w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9', background: 'var(--panel-bg)' }}>
          <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" style={{ opacity: status === 'ok' ? 1 : 0.5 }} />
        </div>
      )}
      <div className="flex gap-2">
        {value?.type === 'custom' && value.url && (
          <Button onClick={handleClear} variant="secondary" size="sm" style={{ flex: 1 }}>
            Clear
          </Button>
        )}
        <Button onClick={handleApply} disabled={!text.trim() || !syntaxOk} variant="primary" size="sm" style={{ flex: 1 }}>
          {value?.type === 'custom' && value.url ? 'Update URL' : 'Use This URL'}
        </Button>
      </div>
    </div>
  );
};

// ─── Main export ───────────────────────────────────────────────────────────────

export const CanvasBackgroundPicker = ({ type, value, onChange }) =>
  type === 'custom'
    ? <CustomUrlPanel value={value} onChange={onChange} />
    : <PhotoGrid value={value} onChange={onChange} />;
