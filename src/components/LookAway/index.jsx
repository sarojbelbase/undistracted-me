import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LockFill } from 'react-bootstrap-icons';
import { MESSAGES } from '../../data/lookawayMessages';
import { ORB_PALETTES } from '../../constants/orbPalettes';
import RingProgress from '../ui/RingProgress';

// Extract just the rgb strings from the shared palette objects
const ORB_RGBS = ORB_PALETTES.map(p => p.rgb);

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

export const LookAway = ({ onDismiss, onSnooze, duration = 20, isDark = true }) => {
  const [remaining, setRemaining] = useState(duration);
  const [timeLabel, setTimeLabel] = useState(getTimeLabel);
  const [isExiting, setIsExiting] = useState(false);
  const [snoozeActive, setSnoozeActive] = useState(null); // null | 5 | 10 | 15
  const [msg] = useState(() => MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
  // Pick a random palette once per overlay mount — independent of user accent
  const orbRgb = useMemo(
    () => ORB_RGBS[Math.floor(Math.random() * ORB_RGBS.length)],
    []
  );

  // ── Graceful dismiss: play exit animation then unmount ────────────────────
  const dismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(onDismiss, 500);
  }, [onDismiss]);

  const handleSnooze = useCallback((mins) => {
    setSnoozeActive(mins);
    setIsExiting(true);
    setTimeout(() => onSnooze?.(mins), 500);
  }, [onSnooze]);

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
        className="la-time-label"
        style={{ color: timelabelRgba }}
      >
        {timeLabel}
      </div>

      {/* ── Center content ────────────────────────────────────────────────── */}
      <div className="la-center">
        {/* Title */}
        <h1 className="la-title" style={{ color: titleColor }}>
          {msg.title}
        </h1>

        {/* Subtitle */}
        <p className="la-subtitle" style={{ color: subtitleRgba }}>
          {msg.subtitle}
        </p>

        {/* Timer */}
        <div
          aria-live="polite"
          aria-label={`${remaining} seconds remaining`}
          className="la-timer"
          style={{ color: timerRgba }}
        >
          {fmtMMSS(remaining)}
        </div>
      </div>

      {/* ── Ghost action row — skip + lock screen ─────────────────────────── */}
      <div className="la-actions">
        {/* ── Primary actions: Skip + Lock Screen ── */}
        <div style={{ display: 'flex', gap: 32 }}>
          <GhostBtn onClick={dismiss} isDark={isDark}>
            <RingProgress progress={progress} orbRgb={orbRgb} />
            Skip
          </GhostBtn>

          <GhostBtn onClick={handleLockScreen} isDark={isDark}>
            <LockFill size={11} style={{ opacity: 0.65 }} />
            Lock Screen
          </GhostBtn>
        </div>

        {/* ── Snooze pills ── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span
            style={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)',
              marginRight: 2,
              userSelect: 'none',
            }}
          >
            Snooze
          </span>
          {[5, 10, 15].map(mins => {
            const isActive = snoozeActive === mins;
            const baseColor = isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)';
            const hoverColor = isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)';
            const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
            const activeBg = `rgba(${orbRgb},0.18)`;
            const activeBorder = `rgba(${orbRgb},0.38)`;
            const activeColor = `rgba(${orbRgb},${isDark ? 0.9 : 1})`;
            return (
              <button
                key={mins}
                type="button"
                onClick={() => handleSnooze(mins)}
                style={{
                  background: isActive ? activeBg : 'transparent',
                  border: `1px solid ${isActive ? activeBorder : borderColor}`,
                  borderRadius: 999,
                  padding: '3px 10px',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  color: isActive ? activeColor : baseColor,
                  transition: 'all 0.18s ease',
                  outline: 'none',
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = hoverColor;
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.26)' : 'rgba(0,0,0,0.26)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isActive) {
                    e.currentTarget.style.color = baseColor;
                    e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)';
                  }
                }}
                aria-label={`Snooze for ${mins} minutes`}
              >
                {mins}m
              </button>
            );
          })}
        </div>
      </div>
    </dialog>,
    document.body
  );
};
