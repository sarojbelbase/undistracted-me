import React, { useState, useCallback } from 'react';
import { CheckLg } from 'react-bootstrap-icons';
import { ACCENT_COLORS } from '../../theme';
import { LANGUAGES } from '../../constants/settings';
import { useSettingsStore } from '../../store';
import {
  hasUnsplashKey,
  getPhotoLibrary,
  downloadNewPhoto,
  deletePhoto,
  jumpToPhotoById,
  LIBRARY_MAX,
} from '../../utilities/unsplash';

export const FocusModeSettings = ({ onRotatePhoto }) => {
  const {
    dateFormat, setDateFormat,
    clockFormat, setClockFormat,
    accent, setAccent,
    mode, setMode,
    language, setLanguage,
  } = useSettingsStore();

  // ── Photo library state ──────────────────────────────────────────────────
  const [library, setLibrary] = useState(() => getPhotoLibrary());
  const [shuffling, setShuffling] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const refreshLibrary = useCallback(() => setLibrary(getPhotoLibrary()), []);

  const handleShuffle = async () => {
    if (shuffling || library.length === 0) return;
    setShuffling(true);
    try { await onRotatePhoto?.(); refreshLibrary(); }
    finally { setShuffling(false); }
  };

  const handleDownload = async () => {
    if (downloading || library.length >= LIBRARY_MAX) return;
    setDownloading(true);
    try { await downloadNewPhoto(); refreshLibrary(); }
    finally { setDownloading(false); }
  };

  const handleUse = async (id) => {
    if (library[0]?.id === id) return;
    await onRotatePhoto?.(id);
    refreshLibrary();
  };

  const handleDelete = async (id) => {
    const wasActive = library[0]?.id === id;
    deletePhoto(id);
    if (wasActive) await onRotatePhoto?.();
    refreshLibrary();
  };

  return (
    <div
      className="absolute right-0 top-11 z-50 flex flex-col gap-4 p-4 w-56 rounded-2xl animate-fade-in"
      style={{
        background: 'rgba(8,9,11,0.86)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Date format */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Date Calendar
        </p>
        <div className="flex gap-1.5">
          {[{ id: 'gregorian', label: 'CE' }, { id: 'bikramSambat', label: 'BS' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDateFormat(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={dateFormat === id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Clock format */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Clock Format
        </p>
        <div className="flex gap-1.5">
          {[{ id: '24h', label: '24h' }, { id: '12h', label: '12h' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setClockFormat(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={(clockFormat || '24h') === id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Appearance
        </p>
        <div className="flex gap-1.5">
          {[{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={mode === id
                ? { background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Accent
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {ACCENT_COLORS.map(color => {
            const locked = color.name === 'Default' && mode === 'dark';
            return (
              <button
                key={color.name}
                title={locked ? 'Not available in dark mode' : color.name}
                onClick={() => !locked && setAccent(color.name)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform focus:outline-none"
                style={{
                  backgroundColor: color.hex,
                  outline: accent === color.name ? '2px solid rgba(255,255,255,0.7)' : 'none',
                  outlineOffset: '2px',
                  opacity: locked ? 0.25 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transform: accent === color.name ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                {accent === color.name && <CheckLg size={11} style={{ color: color.fg }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Language
        </p>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="w-full rounded-lg px-2 py-1.5 text-[10px] outline-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {Object.keys(LANGUAGES).map(k => (
            <option key={k} value={LANGUAGES[k]} style={{ backgroundColor: '#0d0e10', color: '#e5e7eb' }}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* Photo Library */}
      {hasUnsplashKey() && (
        <div>
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
              Background Photos
            </p>
            <span className="text-[9px] font-semibold tabular-nums" style={{ color: 'rgba(255,255,255,0.18)' }}>
              {library.length}/{LIBRARY_MAX}
            </span>
          </div>

          {/* Thumbnail grid */}
          {library.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 mb-2">
              {library.map((ph, i) => {
                const isActive = i === 0;
                return (
                  <div
                    key={ph.id}
                    className="relative group rounded overflow-hidden cursor-pointer"
                    style={{ aspectRatio: '16/9' }}
                    onClick={() => handleUse(ph.id)}
                  >
                    <img
                      src={ph.small}
                      alt={ph.author}
                      className="w-full h-full object-cover transition-opacity duration-150"
                      style={{ opacity: isActive ? 1 : 0.5 }}
                    />

                    {/* Active ring */}
                    {isActive && (
                      <div
                        className="absolute inset-0 rounded pointer-events-none"
                        style={{ boxShadow: 'inset 0 0 0 2px var(--w-accent)' }}
                      />
                    )}

                    {/* Hover overlay */}
                    <div
                      className="absolute inset-0 flex items-end justify-between p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.72) 60%, transparent)' }}
                    >
                      {!isActive && (
                        <span
                          className="text-[7px] font-bold leading-none px-1 py-0.5 rounded"
                          style={{ background: 'var(--w-accent)', color: '#fff' }}
                        >
                          USE
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(ph.id); }}
                        className="ml-auto text-[9px] leading-none px-1 py-0.5 rounded focus:outline-none"
                        style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.7)' }}
                        title="Remove from library"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="flex items-center justify-center rounded-lg mb-2 text-[9px]"
              style={{ height: 44, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)' }}
            >
              Library empty — download a photo
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-1.5">
            {/* Shuffle */}
            <button
              onClick={handleShuffle}
              disabled={shuffling || library.length <= 1}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium focus:outline-none transition-opacity"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: library.length <= 1 ? 'rgba(255,255,255,0.18)' : shuffling ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.5)',
                cursor: library.length <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              {shuffling ? '…' : '↺ Shuffle'}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              disabled={downloading || library.length >= LIBRARY_MAX}
              className="flex-1 relative overflow-hidden text-[10px] py-1.5 rounded-lg font-medium focus:outline-none"
              style={{
                background: 'rgba(255,255,255,0.06)',
                color: library.length >= LIBRARY_MAX ? 'rgba(255,255,255,0.18)' : downloading ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.45)',
                cursor: library.length >= LIBRARY_MAX ? 'not-allowed' : 'pointer',
              }}
            >
              {downloading && (
                <span
                  style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    background: 'rgba(255,255,255,0.09)',
                    animation: 'photo-load-fill 2.4s cubic-bezier(0.4,0,0.2,1) forwards',
                    pointerEvents: 'none',
                  }}
                />
              )}
              <span className="relative" style={{ zIndex: 1 }}>
                {library.length >= LIBRARY_MAX ? 'Library full' : downloading ? 'Fetching…' : '+ Download'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
