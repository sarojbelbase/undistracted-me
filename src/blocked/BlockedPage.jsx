import React, { useState, useEffect, useMemo } from 'react';
import { MESSAGES } from '../data/lookawayMessages';
import { ORB_PALETTES } from '../constants/orbPalettes';
import { shorthandFromUrl } from '../utilities/index';
import { computeAutoMode } from '../utilities/sunTime';

// ─── Module-level: read blocked domain + info once, before React mounts ──────

const readDomain = () => {
  try { return new URLSearchParams(globalThis.location.search).get('d') || ''; }
  catch { return ''; }
};

const readBlockInfo = (domain) => {
  try {
    const raw = localStorage.getItem('blocked_sites');
    if (!raw) return { remainingMs: 0, totalDurationMs: 0, infinite: false, notFound: true };
    const sites = JSON.parse(raw);
    if (!Array.isArray(sites)) return { remainingMs: 0, totalDurationMs: 0, infinite: false, notFound: true };
    for (const s of sites) {
      if (s.domain === domain) {
        if (s.infinite) return { remainingMs: 0, totalDurationMs: 0, infinite: true, notFound: false };
        const remainingMs = Math.max(0, s.blockedUntil - Date.now());
        return { remainingMs, totalDurationMs: s.totalDurationMs || remainingMs, infinite: false, notFound: false };
      }
    }
  } catch { /* ignore */ }
  return { remainingMs: 0, totalDurationMs: 0, infinite: false, notFound: true };
};

const BLOCKED_DOMAIN = readDomain();
const BLOCK_INFO = readBlockInfo(BLOCKED_DOMAIN);

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format milliseconds → MM:SS or HH:MM:SS */
const fmtTime = (ms) => {
  if (ms <= 0) return '00:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  const pad = (n) => (n < 10 ? '0' + n : '' + n);
  if (h > 0) return pad(h) + ':' + pad(mm) + ':' + pad(ss);
  return pad(mm) + ':' + pad(ss);
};

// ─── Read settings from localStorage (no Zustand dependency) ──────────────────

const readSettings = () => {
  try {
    const raw = localStorage.getItem('undistracted_settings');
    if (!raw) return { mode: 'light', accent: 'Blueberry' };
    const parsed = JSON.parse(raw);
    const state = parsed.state || parsed;
    return {
      mode: state.mode || 'light',
      accent: state.accent || 'Blueberry',
    };
  } catch {
    return { mode: 'light', accent: 'Blueberry' };
  }
};

/** Resolve 'auto' mode using sun-time math — same logic as themeInit + applyTheme. */
const resolveMode = (mode) => {
  if (mode === 'auto') return computeAutoMode();
  return mode === 'dark' ? 'dark' : 'light';
};

// ─── Theme colour tokens ─────────────────────────────────────────────────────

const getThemeTokens = (isDark, orbRgb) => ({
  bg: isDark ? '#060608' : '#f5f5f7',
  titleColor: isDark ? '#ffffff' : '#0a0a0c',
  msgColor: isDark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.38)',
  timerColor: isDark ? `rgba(${orbRgb},0.7)` : `rgba(${orbRgb},0.8)`,
  orbOpacity1: isDark ? 0.38 : 0.28,
  orbOpacity2: isDark ? 0.22 : 0.16,
  orbOpacity3: isDark ? 0.16 : 0.1,
  vignetteStart: isDark ? 'rgba(4,4,6,0.65)' : 'rgba(245,245,247,0.55)',
  vignetteEnd: isDark ? 'rgba(2,2,4,0.92)' : 'rgba(240,240,242,0.90)',
});

/** Check localStorage — is the current domain still blocked as infinite? */
const isNowInfinite = (blockedDomain) => {
  try {
    const raw = localStorage.getItem('blocked_sites');
    if (!raw) return false;
    const sites = JSON.parse(raw);
    if (!Array.isArray(sites)) return false;
    return sites.some(s => s.domain === blockedDomain && s.infinite);
  } catch { return false; }
};

/** Remove a domain from the blocked_sites list in localStorage. */
const removeBlockedEntry = (blockedDomain) => {
  try {
    const raw = localStorage.getItem('blocked_sites');
    if (!raw) return;
    const sites = JSON.parse(raw);
    if (!Array.isArray(sites)) return;
    const filtered = sites.filter(s => s.domain !== blockedDomain);
    localStorage.setItem('blocked_sites', JSON.stringify(filtered));
  } catch { /* ignore */ }
};

// ─── Component ────────────────────────────────────────────────────────────────

const BlockedPage = () => {
  const isDark = resolveMode(readSettings().mode) === 'dark';
  const blockedDomain = BLOCKED_DOMAIN;
  const { remainingMs: initialRemaining, totalDurationMs, infinite, notFound } = BLOCK_INFO;

  // ── Pick a random orb palette for visual variety (matching LookAway) ───
  const orbRgb = useMemo(
    () => ORB_PALETTES[Math.floor(Math.random() * ORB_PALETTES.length)].rgb,
    [],
  );

  // ── Pick a random message (stable for the session) ─────────────────────
  const msg = useMemo(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
    [],
  );

  // ── Countdown state ────────────────────────────────────────────────────
  const [remainingMs, setRemainingMs] = useState(() => initialRemaining);
  const [redirecting, setRedirecting] = useState(false);

  // Countdown tick — only for timed blocks with a valid entry in storage.
  // Skip if infinite, or if the entry was not found (site was unblocked).
  const tick = !infinite && !notFound;
  useEffect(() => {
    if (!tick) return;

    if (remainingMs <= 0 && !redirecting) {
      if (isNowInfinite(blockedDomain)) return;
      removeBlockedEntry(blockedDomain);

      // Show "Redirecting now..." for 5 seconds, then navigate
      setRedirecting(true);
      const t = setTimeout(() => {
        if (blockedDomain) {
          globalThis.location.href = 'https://' + blockedDomain;
        } else {
          globalThis.location.reload();
        }
      }, 5000);
      return () => clearTimeout(t);
    }
    if (!redirecting) {
      const t = setInterval(() => {
        setRemainingMs((r) => Math.max(0, r - 1000));
      }, 1000);
      return () => clearInterval(t);
    }
  }, [tick, remainingMs, blockedDomain, redirecting]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-redirect when site was unblocked (notFound) ────────────────────
  useEffect(() => {
    if (!notFound || !blockedDomain) return;
    setRedirecting(true);
    const t = setTimeout(() => {
      globalThis.location.href = 'https://' + blockedDomain;
    }, 5000);
    return () => clearTimeout(t);
  }, [notFound, blockedDomain]);

  // ── Computed values ────────────────────────────────────────────────────
  // Progress of total block duration (0→1), not just time since page load
  const elapsed = totalDurationMs > 0 ? 1 - remainingMs / totalDurationMs : 1;
  const progress = Math.min(1, Math.max(0, elapsed));

  const {
    bg, titleColor, msgColor, timerColor,
    orbOpacity1, orbOpacity2, orbOpacity3,
    vignetteStart, vignetteEnd,
  } = getThemeTokens(isDark, orbRgb);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        overflow: 'hidden',
      }}
    >
      {/* ── Orb field ────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          animation: 'lookaway-orb-spin 48s linear infinite',
          pointerEvents: 'none',
          transformOrigin: '50% 50%',
        }}
      >
        {/* Primary orb — center bloom */}
        <div style={{
          position: 'absolute',
          width: '70vmin',
          height: '70vmin',
          top: 'calc(50vh - 35vmin)',
          left: 'calc(50vw - 35vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(${orbRgb},${orbOpacity1}) 0%, rgba(${orbRgb},0.08) 50%, transparent 72%)`,
          filter: 'blur(52px)',
          animation: 'lookaway-bloom 8s ease-in-out infinite',
        }} />
        {/* Secondary orb — top-right */}
        <div style={{
          position: 'absolute',
          width: '50vmin',
          height: '50vmin',
          top: 'calc(10vh - 5vmin)',
          right: 'calc(8vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(${orbRgb},${orbOpacity2}) 0%, transparent 65%)`,
          filter: 'blur(64px)',
        }} />
        {/* Tertiary orb — bottom-left counter-rotation */}
        <div style={{
          position: 'absolute',
          width: '44vmin',
          height: '44vmin',
          bottom: 'calc(8vh - 5vmin)',
          left: 'calc(6vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, rgba(${orbRgb},${orbOpacity3}) 0%, transparent 62%)`,
          filter: 'blur(80px)',
          animation: 'lookaway-orb-counter 32s linear infinite',
          transformOrigin: '50% 50%',
        }} />
      </div>

      {/* ── Vignette ─────────────────────────────────────────────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, ${vignetteStart} 65%, ${vignetteEnd} 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Center content ───────────────────────────────────────────────── */}
      <div className="blocked-center">
        {/* Domain label — clean, visible, shorthandFromUrl handles capitalization */}
        <p className="blocked-domain-label">
          <span style={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>
            {shorthandFromUrl('https://' + blockedDomain)}
          </span>
          <span style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }}>
            {notFound ? ' is no longer blocked' : ' is blocked for now'}
          </span>
        </p>

        {/* Hero message — the focal point */}
        <h1 className="blocked-hero" style={{ color: titleColor }}>
          {notFound ? 'All clear' : msg.title}
        </h1>

        {/* Supporting message — the depth */}
        <p className="blocked-sub" style={{ color: msgColor }}>
          {notFound ? 'This site was unblocked. You can visit it now.' : msg.subtitle}
        </p>

        {/* Timer and progress — only for timed blocks, hidden for infinite / not-found */}
        {(!infinite && !notFound) && (
          <>
            {redirecting ? (
              <div className="blocked-redirecting" style={{ color: timerColor }}>
                Redirecting now
              </div>
            ) : (
              <div className="blocked-timer" style={{ color: timerColor }}>
                {fmtTime(remainingMs)}
              </div>
            )}

            {!redirecting && (
              <div className="blocked-progress-track">
                <div
                  className="blocked-progress-fill"
                  style={{
                    width: Math.round(progress * 100) + '%',
                    background: `rgba(${orbRgb},0.6)`,
                  }}
                />
              </div>
            )}
          </>
        )}

        {/* Redirecting message for unblocked sites (notFound) */}
        {notFound && (
          <div className="blocked-redirecting" style={{ color: timerColor }}>
            Redirecting now
          </div>
        )}
      </div>
    </div>
  );
};

export default BlockedPage;
