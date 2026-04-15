import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LockFill } from 'react-bootstrap-icons';
import { MESSAGES } from '../../data/lookawayMessages';

// 7 vibes — one picked randomly per overlay instance, independent of accent
const ORB_PALETTES = [
  '54,133,230',    // Blueberry
  '198,38,46',     // Strawberry
  '222,62,128',    // Bubblegum
  '165,109,226',   // Grape
  '243,115,41',    // Orange
  '40,188,163',    // Mint
  '207,162,94',    // Latte
];



// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtMMSS = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

const getTimeLabel = () => {
  const d = new Date();
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes();
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
};

// SVG ring constants
const RING_R = 7;
const RING_CIRC = 2 * Math.PI * RING_R;

// ─── Thin ring progress (accent-tinted) ───────────────────────────────────────

const RingProgress = ({ progress, orbRgb }) => {
  const dashOffset = RING_CIRC * (1 - progress);
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden>
      <circle cx="9" cy="9" r={RING_R} stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" fill="none" />
      <circle
        cx="9" cy="9" r={RING_R}
        stroke={`rgba(${orbRgb},0.8)`}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        strokeDasharray={RING_CIRC}
        strokeDashoffset={dashOffset}
        transform="rotate(-90 9 9)"
        style={{ transition: 'stroke-dashoffset 1.05s linear' }}
      />
    </svg>
  );
};

// ─── Ghost text button (no border, no band) ───────────────────────────────────

const GhostBtn = ({ onClick, children, isDark }) => {
  // Direct DOM style mutation — no React state needed, zero re-renders on hover.
  const base = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.28)';
  const hover = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(0,0,0,0.72)';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'none',
        border: 'none',
        padding: '6px 4px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: base,
        transition: 'color 0.3s ease',
        outline: 'none',
        userSelect: 'none',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = hover; }}
      onMouseLeave={e => { e.currentTarget.style.color = base; }}
    >
      {children}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const LookAway = ({ onDismiss, duration = 20, isDark = true }) => {
  const [remaining, setRemaining] = useState(duration);
  const [timeLabel, setTimeLabel] = useState(getTimeLabel);
  const [isExiting, setIsExiting] = useState(false);
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  // Pick a random palette once per overlay mount — independent of user accent
  const orbRgb = useMemo(
    () => ORB_PALETTES[Math.floor(Math.random() * ORB_PALETTES.length)],
    []
  );

  // ── Graceful dismiss: play exit animation then unmount ────────────────────
  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 500);
  }, [onDismiss]);

  // ── Countdown ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (remaining <= 0) { dismiss(); return; }
    const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(t);
  }, [remaining, dismiss]);

  // ── Clock label updates ───────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => setTimeLabel(getTimeLabel()), 60_000);
    return () => clearInterval(t);
  }, []);

  // ── Escape to dismiss ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') dismiss(); };
    globalThis.addEventListener('keydown', handler);
    return () => globalThis.removeEventListener('keydown', handler);
  }, [dismiss]);

  // ── Lock screen ───────────────────────────────────────────────────────────
  const handleLockScreen = useCallback(() => {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      el.requestFullscreen().catch(() => { });
    }
  }, []);

  const progress = remaining / duration;
  const anim = isExiting
    ? 'lookaway-out 0.5s cubic-bezier(0.4,0,1,1) forwards'
    : 'lookaway-in 0.7s cubic-bezier(0.16,1,0.3,1) both';

  // ── Theme-aware colour tokens ─────────────────────────────────────────────
  const bg = isDark ? '#060608' : '#f5f5f7';
  const titleColor = isDark ? '#ffffff' : '#0a0a0c';
  const subtitleRgba = isDark ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.38)';
  const timelabelRgba = isDark
    ? `rgba(${orbRgb},0.55)`
    : `rgba(${orbRgb},0.70)`;
  const timerRgba = isDark ? `rgba(${orbRgb},0.7)` : `rgba(${orbRgb},0.8)`;
  const orbOpacity1 = isDark ? 0.38 : 0.28;
  const orbOpacity2 = isDark ? 0.22 : 0.16;
  const orbOpacity3 = isDark ? 0.16 : 0.1;
  const vignetteStart = isDark ? 'rgba(4,4,6,0.65)' : 'rgba(245,245,247,0.55)';
  const vignetteEnd = isDark ? 'rgba(2,2,4,0.92)' : 'rgba(240,240,242,0.90)';

  return createPortal(
    <dialog
      open
      aria-label="Look away break"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: bg,
        animation: anim,
        overflow: 'hidden',
        maxWidth: 'none',
        maxHeight: 'none',
        width: '100%',
        height: '100%',
        padding: 0,
        margin: 0,
        border: 'none',
      }}
    >
      {/* ── Orb field — viewport-sized so rotation never compresses them ───── */}
      {/*
        Key insight: orbs are positioned with fixed vw/vh units so they keep
        their true circular shape regardless of the parent's rotation transform.
        The spin wrapper is purely a rotation pivot; orb dimensions are
        independent of it, so no ellipse / pixelation artefacts.
      */}
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
        {/* Primary orb — dead centre, large breathing bloom */}
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
        {/* Secondary orb — offset top-right */}
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
        {/* Tertiary orb — offset bottom-left, counter-rotation */}
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

      {/* ── Subtle conic shimmer — slow independent counter-rotation ──────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: '-20%',
          background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(${orbRgb},0.04) 90deg, transparent 180deg, rgba(${orbRgb},0.03) 270deg, transparent 360deg)`,
          animation: 'lookaway-orb-counter 60s linear infinite',
          pointerEvents: 'none',
        }}
      />

      {/* ── Deep vignette — crushes edges to match background ─────────────── */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, ${vignetteStart} 65%, ${vignetteEnd} 100%)`,
          pointerEvents: 'none',
        }}
      />

      {/* ── Time label — top, orb-tinted ────────────────────────────────────── */}
      <div
        style={{
          position: 'absolute',
          top: 32,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: timelabelRgba,
          fontSize: '0.8rem',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          fontWeight: 600,
          animation: 'lookaway-rise 1s cubic-bezier(0.16,1,0.3,1) 0.15s both',
          userSelect: 'none',
        }}
      >
        {timeLabel}
      </div>

      {/* ── Center content ────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 32px',
          maxWidth: 580,
          animation: 'lookaway-rise 0.8s cubic-bezier(0.16,1,0.3,1) 0.06s both',
        }}
      >
        {/* Title — airy, light weight, high contrast */}
        <h1
          style={{
            color: titleColor,
            fontSize: 'clamp(2.4rem, 5.5vw, 4.2rem)',
            fontWeight: 200,
            letterSpacing: '-0.01em',
            lineHeight: 1.06,
            margin: '0 0 1.1rem',
            userSelect: 'none',
          }}
        >
          {msg.title}
        </h1>

        {/* Subtitle — softer, mid-weight */}
        <p
          style={{
            color: subtitleRgba,
            fontSize: '1rem',
            fontWeight: 400,
            letterSpacing: '0.01em',
            lineHeight: 1.72,
            maxWidth: 400,
            margin: '0 0 2.6rem',
            userSelect: 'none',
          }}
        >
          {msg.subtitle}
        </p>

        {/* Timer — orb-tinted, monospace, light weight */}
        <div
          aria-live="polite"
          aria-label={`${remaining} seconds remaining`}
          style={{
            color: timerRgba,
            fontSize: 'clamp(1.7rem, 3.2vw, 2.6rem)',
            fontFamily: "'SF Mono','Fira Code','Consolas',monospace",
            fontWeight: 300,
            letterSpacing: '0.12em',
            fontVariantNumeric: 'tabular-nums',
            userSelect: 'none',
          }}
        >
          {fmtMMSS(remaining)}
        </div>
      </div>

      {/* ── Ghost action row — no borders, no bands ───────────────────────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 44,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          animation: 'lookaway-rise 1s ease-out 0.3s both',
        }}
      >
        <GhostBtn onClick={dismiss} isDark={isDark}>
          <RingProgress progress={progress} orbRgb={orbRgb} />
          Skip
        </GhostBtn>

        <GhostBtn onClick={handleLockScreen} isDark={isDark}>
          <LockFill size={11} style={{ opacity: 0.65 }} />
          Lock Screen
        </GhostBtn>
      </div>
    </dialog>,
    document.body
  );
};
