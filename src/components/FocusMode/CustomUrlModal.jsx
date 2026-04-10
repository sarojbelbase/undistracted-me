import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { XLg, Link45deg, CheckLg } from 'react-bootstrap-icons';

const LS_KEY = 'fm_custom_bg_url';

/** Reads the persisted custom background URL, or null. */
export const getCustomBgUrl = () => {
  try { return localStorage.getItem(LS_KEY) || null; }
  catch { return null; }
};

/** Persists (or clears) the custom background URL. */
export const setCustomBgUrl = (url) => {
  try {
    if (url) localStorage.setItem(LS_KEY, url);
    else localStorage.removeItem(LS_KEY);
  } catch { }
};

// ─── URL validation ───────────────────────────────────────────────────────────

const VALID_URL = /^https:\/\/.+\.(jpg|jpeg|png|webp|gif|avif|svg)(\?.*)?$/i;
const VALID_HTTP = /^https?:\/\/.+/i;

const classifyUrl = (raw) => {
  const s = raw.trim();
  if (!s) return { ok: false, hint: null };
  if (VALID_URL.test(s)) return { ok: true, hint: null };
  if (VALID_HTTP.test(s)) {
    // Could be an image served without a file extension — allow with a soft warning
    return { ok: true, hint: 'URL may not be an image — it will be verified on Apply.' };
  }
  return { ok: false, hint: 'Must be a valid https:// URL.' };
};

// ─── Spinning ring (loading indicator) ───────────────────────────────────────

const Spinner = () => (
  <svg
    width="16" height="16" viewBox="0 0 16 16" fill="none"
    style={{ animation: 'customBgSpin 0.8s linear infinite' }}
    aria-hidden
  >
    <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
    <path d="M8 2 A6 6 0 0 1 14 8" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// ─── Main modal ───────────────────────────────────────────────────────────────

/**
 * CustomUrlModal — centered glass overlay inside Focus Mode.
 *
 * Props:
 *   onApply(url)  — called with the verified URL string to set as background
 *   onClose()     — dismiss without applying
 */
export const CustomUrlModal = ({ onApply, onClose }) => {
  const [value, setValue] = useState(() => getCustomBgUrl() || '');
  const [status, setStatus] = useState('idle'); // idle | checking | ok | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);
  const checkRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  // ESC to close
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const { ok: syntaxOk, hint } = classifyUrl(value);

  const verify = useCallback(() => {
    const url = value.trim();
    const { ok } = classifyUrl(url);
    if (!ok) {
      setErrorMsg('Enter an https:// image URL to continue.');
      setStatus('error');
      return;
    }

    setStatus('checking');
    setPreviewUrl(null);
    setErrorMsg('');

    // Clear any pending check
    if (checkRef.current) clearTimeout(checkRef.current);

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      img.src = '';
      // Don't outright reject — some servers block CORS headers but still serve the image
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
      // Still allow — browser CORS may block the load event even for valid images
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
    onClose();
  };

  const handleClear = () => {
    setCustomBgUrl(null);
    onApply(null);
    onClose();
  };

  const existing = getCustomBgUrl();

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set custom background URL"
      className="fixed inset-0 flex items-center justify-center"
      style={{ zIndex: 80, background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <style>{`
        @keyframes customBgSpin { to { transform: rotate(360deg); } }
        @keyframes customBgIn {
          from { opacity: 0; transform: scale(0.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      <div
        className="flex flex-col w-[420px] max-w-[calc(100vw-32px)] rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(10,11,13,0.92)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.07)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          animation: 'customBgIn 0.28s cubic-bezier(0.16,1,0.3,1) both',
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-2.5">
            <Link45deg size={15} style={{ color: 'rgba(255,255,255,0.45)' }} />
            <span
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.01em' }}
            >
              Custom Background
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-full transition-colors btn-close cursor-pointer focus:outline-none"
            style={{ color: 'rgba(255,255,255,0.3)' }}
            aria-label="Close"
          >
            <XLg size={11} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col gap-4 px-5 py-5">

          {/* Input row */}
          <div className="flex flex-col gap-1.5">
            <label
              className="text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: 'rgba(255,255,255,0.26)' }}
            >
              Image URL
            </label>
            <div
              className="flex items-center gap-2 rounded-xl px-3"
              style={{
                height: 40,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${status === 'error' ? 'rgba(198,38,46,0.6)' : status === 'ok' ? 'rgba(104,183,35,0.5)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'border-color 0.2s',
              }}
            >
              <Link45deg size={13} style={{ color: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="url"
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                value={value}
                onChange={e => { setValue(e.target.value); setStatus('idle'); setErrorMsg(''); setPreviewUrl(null); }}
                onKeyDown={e => { if (e.key === 'Enter') verify(); }}
                placeholder="https://example.com/photo.jpg"
                className="flex-1 min-w-0 bg-transparent outline-none text-[12px]"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  caretColor: 'var(--w-accent)',
                }}
              />
              <style>{`input::placeholder { color: rgba(255,255,255,0.18); }`}</style>
              {status === 'checking' && <Spinner />}
              {status === 'ok' && (
                <CheckLg size={13} style={{ color: 'rgba(104,183,35,0.9)', flexShrink: 0 }} />
              )}
            </div>

            {/* Hint / error */}
            {(hint || errorMsg) && (
              <p
                className="text-[10px]"
                style={{ color: status === 'error' ? 'rgba(198,38,46,0.8)' : 'rgba(255,255,255,0.28)' }}
              >
                {errorMsg || hint}
              </p>
            )}
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
                Preview
              </span>
              <div
                className="w-full rounded-xl overflow-hidden"
                style={{ aspectRatio: '16/7', background: '#0d0e10' }}
              >
                <img
                  src={previewUrl}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                  style={{ opacity: 0, transition: 'opacity 0.35s ease', display: 'block' }}
                  onLoad={e => { e.currentTarget.style.opacity = '1'; }}
                />
              </div>
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-2 pt-1">
            {/* Verify */}
            {status !== 'ok' && (
              <button
                onClick={verify}
                disabled={!syntaxOk}
                className="px-4 py-2 rounded-xl text-[11px] font-semibold transition-all focus:outline-none cursor-pointer"
                style={{
                  background: syntaxOk ? 'rgba(255,255,255,0.09)' : 'rgba(255,255,255,0.04)',
                  color: syntaxOk ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                  cursor: syntaxOk ? 'pointer' : 'not-allowed',
                }}
              >
                Verify
              </button>
            )}

            {/* Apply */}
            <button
              onClick={handleApply}
              disabled={!value.trim()}
              className="flex-1 py-2 rounded-xl text-[11px] font-semibold transition-all focus:outline-none"
              style={{
                background: value.trim() ? 'var(--w-accent)' : 'rgba(255,255,255,0.05)',
                color: value.trim() ? 'var(--w-accent-fg)' : 'rgba(255,255,255,0.2)',
                cursor: value.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              Apply as Background
            </button>

            {/* Clear — only shown if a custom URL is currently active */}
            {existing && (
              <button
                onClick={handleClear}
                className="px-3 py-2 rounded-xl text-[11px] font-medium transition-all focus:outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.32)' }}
                title="Remove custom background"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};
