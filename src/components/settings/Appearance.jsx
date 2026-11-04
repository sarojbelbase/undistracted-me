/**
 * Appearance — Theme, Accent colour, and Widget Style settings.
 * Canvas mode: uses var(--card-*) / var(--w-*) CSS tokens only.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SunFill, MoonFill, CircleHalf, CheckLg, Link45deg, ArrowClockwise } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { ACCENT_COLORS } from '../../theme';
import { CARD_STYLES } from '../../constants/cardStyles';
import { TooltipBtn } from '../ui/TooltipBtn';
import { useAutoTheme } from '../../hooks/useAutoTheme';
import {
  getPhotoLibrary,
  getThumbUrl,
  rotatePhoto,
  downloadCuratedPhotos,
  updatePhotoColor,
} from '../../utilities/unsplash';
import { extractColorFromImage } from '../../utilities/favicon';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

const Segment = ({ children, style = {} }) => (
  <div style={{
    display: 'flex', gap: 3, padding: 3,
    borderRadius: 11,
    background: 'var(--panel-bg)',
    border: '1px solid var(--card-border)',
    ...style,
  }}>
    {children}
  </div>
);

// Shared small action-button look (used by the Curated / Custom sub-panels).
const smallBtn = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  padding: '7px 10px', borderRadius: 8, border: '1px solid var(--card-border)',
  background: 'var(--panel-bg)', color: 'var(--w-ink-2)', cursor: 'pointer',
  fontSize: 12, fontWeight: 600, transition: 'all 0.15s ease',
};

// ── URL classification ────────────────────────────────────────────────────────
// Non-empty; prepends https:// when a scheme is missing; rejects non-http(s)
// and whitespace (a URL/hostname cannot contain spaces).
const classifyUrl = (raw) => {
  const s = (raw || '').trim();
  if (!s) return { ok: false, hint: null };
  if (/\s/.test(s)) return { ok: false, hint: 'URL cannot contain spaces.' };
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(withScheme);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return { ok: false, hint: 'Only http(s) URLs are allowed.' };
    }
    if (!u.hostname) return { ok: false, hint: 'Enter a valid image URL (e.g. example.com/photo.jpg).' };
    return { ok: true, url: withScheme, hint: null };
  } catch {
    return { ok: false, hint: 'Enter a valid image URL (e.g. example.com/photo.jpg).' };
  }
};

// ── Curated panel ─────────────────────────────────────────────────────────────
const CuratedPanel = ({ activeUrl, onApply }) => {
  const [photos, setPhotos] = useState(() => getPhotoLibrary());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await downloadCuratedPhotos();
      const lib = getPhotoLibrary();
      setPhotos(lib);
      if (!lib.length) setError('Could not reach the photo server. Check your connection.');
    } catch {
      if (!getPhotoLibrary().length) setError('Could not reach the photo server. Check your connection.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!getPhotoLibrary().length) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefer the photo matching the active URL (a user-selected one), else the
  // library head (which `rotatePhoto` cycles and `useCanvasBg` falls back to).
  const current = useMemo(() => {
    if (activeUrl) {
      const match = photos.find((p) => p.regular === activeUrl || p.url === activeUrl || p.small === activeUrl);
      if (match) return match;
    }
    return photos[0] ?? null;
  }, [photos, activeUrl]);

  const thumbSrc = current ? (getThumbUrl(current) || current.regular || current.url) : null;

  const cycle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = await rotatePhoto();
      setPhotos(getPhotoLibrary());
      if (next) onApply({ url: next.regular || next.url || null, color: next.color || null });
    } finally {
      setBusy(false);
    }
  };

  const handleThumbLoad = (e) => {
    if (!current) return;
    extractColorFromImage(e.currentTarget, (color) => {
      updatePhotoColor(current.id, color);
    });
  };

  if (!thumbSrc) {
    return (
      <div style={{
        marginTop: 8, padding: 10, borderRadius: 8,
        background: 'var(--panel-bg)', border: '1px solid var(--card-border)',
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start',
      }}>
        <span style={{ fontSize: 11, color: 'var(--w-ink-3)' }}>
          {error || 'No curated photos yet.'}
        </span>
        <button onClick={refresh} disabled={busy} style={{ ...smallBtn, opacity: busy ? 0.6 : 1 }}>
          <ArrowClockwise size={12} /> {busy ? 'Loading…' : 'Load photos'}
        </button>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        aspectRatio: '16 / 9', background: current?.color || 'var(--panel-bg)',
      }}>
        <img
          src={thumbSrc}
          alt=""
          aria-hidden
          crossOrigin="anonymous"
          decoding="async"
          onLoad={handleThumbLoad}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={cycle} disabled={busy} style={{ ...smallBtn, flex: 1, opacity: busy ? 0.6 : 1 }}>
          <ArrowClockwise size={12} /> Next photo
        </button>
      </div>
    </div>
  );
};

// ── Custom URL panel ──────────────────────────────────────────────────────────
const CustomPanel = ({ initialUrl, onApply }) => {
  const [value, setValue] = useState(initialUrl || '');
  const [hint, setHint] = useState(null);

  const result = classifyUrl(value);

  const apply = () => {
    if (!result.ok) {
      setHint(result.hint || 'Enter a valid URL to apply.');
      return;
    }
    setHint(null);
    onApply({ url: result.url });
  };

  const onChange = (e) => { setValue(e.target.value); setHint(null); };

  const shownHint = value.trim() && !result.ok ? (hint || result.hint) : hint;

  return (
    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '0 10px',
          height: 34, borderRadius: 8, background: 'var(--panel-bg)', border: '1px solid var(--card-border)',
        }}>
          <Link45deg size={13} style={{ color: 'var(--w-ink-3)', flexShrink: 0 }} />
          <input
            type="text"
            value={value}
            onChange={onChange}
            onKeyDown={(e) => { if (e.key === 'Enter') apply(); }}
            placeholder="example.com/photo.jpg"
            autoComplete="off"
            spellCheck={false}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              color: 'var(--w-ink-2)', fontSize: 12, fontFamily: 'inherit',
            }}
          />
        </div>
        <button onClick={apply} disabled={!value.trim()}
          style={{ ...smallBtn, flexShrink: 0, opacity: value.trim() ? 1 : 0.5, cursor: value.trim() ? 'pointer' : 'default' }}>
          Apply
        </button>
      </div>
      {shownHint && <span style={{ fontSize: 10, color: 'rgb(252,129,129)' }}>{shownHint}</span>}
    </div>
  );
};

export const Appearance = () => {
  const { mode, setMode, accent, setAccent, cardStyle, setCardStyle, canvasBg, setCanvasBg } = useSettingsStore();

  // Canonical auto-mode resolution — resolves 'auto' to the effective light/dark
  // so the accent swatches use the correct tone even during the day.
  const effectiveMode = useAutoTheme(mode, accent, cardStyle);

  const bgType = canvasBg?.type ?? 'solid';

  const selectSolid = () => setCanvasBg({ type: 'solid', orbId: canvasBg?.orbId ?? 'blueberry', url: null, color: null });
  const selectOrb = () => setCanvasBg({ type: 'orb', orbId: canvasBg?.orbId ?? 'blueberry', url: null, color: null });
  const selectDefault = () => setCanvasBg({ type: 'default', orbId: null, url: null, color: null });
  const selectCurated = () => setCanvasBg({ type: 'curated', orbId: null, url: null, color: null });
  const selectCustom = () => setCanvasBg({ type: 'custom', orbId: null, url: null, color: null });

  const applyCurated = useCallback(
    ({ url, color }) => setCanvasBg({ type: 'curated', orbId: null, url: url ?? null, color: color ?? null }),
    [setCanvasBg],
  );
  const applyCustom = useCallback(
    ({ url }) => setCanvasBg({ type: 'custom', orbId: null, url: url ?? null, color: null }),
    [setCanvasBg],
  );

  const backgroundOptions = [
    { id: 'solid', label: 'Solid', hint: 'Accent tint', onClick: selectSolid },
    { id: 'orb', label: 'Motion', hint: 'Animated orb', onClick: selectOrb },
    { id: 'default', label: 'Photo', hint: 'Bundled', onClick: selectDefault },
    { id: 'curated', label: 'Curated', hint: 'Unsplash', onClick: selectCurated },
    { id: 'custom', label: 'Custom', hint: 'URL', onClick: selectCustom },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ── Widget Style ── */}
      <div>
        <SectionLabel>Widget Style</SectionLabel>
        <Segment>
          {CARD_STYLES.map(({ id, label, hint }) => {
            const selected = cardStyle === id;
            return (
              <button
                key={id}
                onClick={() => setCardStyle(id)}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s ease',
                  background: selected ? 'var(--w-accent)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: '1.3', color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-2)' }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 10, lineHeight: '1.3',
                  color: selected ? 'color-mix(in srgb, var(--w-accent-fg) 65%, transparent)' : 'var(--w-ink-5)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {hint}
                </span>
              </button>
            );
          })}
        </Segment>
      </div>

      {/* ── Background ── */}
      <div>
        <SectionLabel>Background</SectionLabel>
        <Segment>
          {backgroundOptions.map(({ id, label, hint, onClick }) => {
            const selected = bgType === id;
            return (
              <button
                key={id}
                onClick={onClick}
                style={{
                  flex: 1,
                  display: 'flex', flexDirection: 'column', gap: 2,
                  padding: '8px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  textAlign: 'left', transition: 'all 0.15s ease',
                  background: selected ? 'var(--w-accent)' : 'transparent',
                }}
              >
                <span style={{ fontSize: 12, fontWeight: 600, lineHeight: '1.3', color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-2)' }}>
                  {label}
                </span>
                <span style={{
                  fontSize: 10, lineHeight: '1.3',
                  color: selected ? 'color-mix(in srgb, var(--w-accent-fg) 65%, transparent)' : 'var(--w-ink-5)',
                }}>
                  {hint}
                </span>
              </button>
            );
          })}
        </Segment>

        {bgType === 'curated' && (
          <CuratedPanel activeUrl={canvasBg?.url ?? null} onApply={applyCurated} />
        )}
        {bgType === 'custom' && (
          <CustomPanel
            initialUrl={canvasBg?.type === 'custom' ? (canvasBg?.url ?? '') : ''}
            onApply={applyCustom}
          />
        )}
      </div>

      {/* ── Theme ── */}
      <div>
        <SectionLabel>Theme</SectionLabel>
        <Segment>
          {[
            { id: 'light', label: 'Light', icon: <SunFill size={11} /> },
            { id: 'auto', label: 'Auto', icon: <CircleHalf size={11} /> },
            { id: 'dark', label: 'Dark', icon: <MoonFill size={11} /> },
          ].map(({ id, label, icon }) => {
            const selected = mode === id;
            return (
              <TooltipBtn
                key={id}
                tooltip={id === 'auto' ? 'Follows sunrise & sunset at your location' : undefined}
                aria-label={label}
                onClick={() => setMode(id)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, transition: 'all 0.15s ease',
                  background: selected ? 'var(--w-accent)' : 'transparent',
                  color: selected ? 'var(--w-accent-fg)' : 'var(--w-ink-3)',
                }}
              >
                {icon}{label}
              </TooltipBtn>
            );
          })}
        </Segment>
      </div>

      {/* ── Accent ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <SectionLabel>Accent</SectionLabel>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-accent)', marginBottom: 8 }}>{accent}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {ACCENT_COLORS.map(color => {
            const isDarkMode = effectiveMode === 'dark';
            const swatchHex = isDarkMode ? (color.darkHex ?? color.hex) : color.hex;
            const selected = accent === color.name;
            return (
              <TooltipBtn
                key={color.name}
                tooltip={color.name}
                onClick={() => setAccent(color.name)}
                style={{
                  width: 26, height: 26, borderRadius: '50%', border: 'none', padding: 0,
                  backgroundColor: swatchHex,
                  boxShadow: selected ? 'inset 0 0 0 99px rgba(0,0,0,0.22)' : 'none',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s ease',
                  flexShrink: 0,
                }}
              >
                {selected && <CheckLg size={12} style={{ color: isDarkMode ? (color.darkFg ?? color.fg) : color.fg }} />}
              </TooltipBtn>
            );
          })}
        </div>
      </div>

    </div>
  );
};
