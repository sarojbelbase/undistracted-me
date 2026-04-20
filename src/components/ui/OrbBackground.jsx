import React from 'react';

/**
 * Animated orb colour-motion background.
 *
 * Props:
 *  - rgb    (string)   — "r,g,b" override; defaults to --w-accent-rgb CSS var
 *  - isDark (boolean)  — adjusts opacity for light vs dark backdrop
 *  - zIndex (number)   — stack order, default 0
 */

export const OrbBackground = ({ zIndex = 0, rgb, isDark = true }) => {
  const c = rgb
    ? (op) => `rgba(${rgb},${op})`
    : (op) => `rgba(var(--w-accent-rgb),${op})`;

  // Light-mode needs stronger opacity so orbs show against the pale canvas
  const op = isDark
    ? { p: 0.52, s: 0.32, t: 0.26, q: 0.18, r: 0.22, sh: 0.05 }
    : { p: 0.5, s: 0.3, t: 0.24, q: 0.16, r: 0.2, sh: 0.07 };

  return (
    <>
      {/* ── Group A — main CW spin (40 s) ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex,
        animation: 'orbSpin 40s linear infinite',
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
        willChange: 'transform',
      }}>
        {/* Primary — centre bloom */}
        <div style={{
          position: 'absolute',
          width: '82vmin', height: '82vmin',
          top: 'calc(50vh - 41vmin)', left: 'calc(50vw - 41vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${c(op.p)} 0%, ${c(op.p * 0.25)} 50%, transparent 72%)`,
          filter: 'blur(22px)',
          animation: 'orbBloom 7s ease-in-out infinite',
        }} />
        {/* Secondary — top-right */}
        <div style={{
          position: 'absolute',
          width: '64vmin', height: '64vmin',
          top: 'calc(6vh - 5vmin)', right: 'calc(4vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${c(op.s)} 0%, transparent 65%)`,
          filter: 'blur(28px)',
        }} />
      </div>

      {/* ── Group B — CCW spin (28 s) ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex,
        animation: 'orbCounter 28s linear infinite',
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
        willChange: 'transform',
      }}>
        {/* Tertiary — bottom-left */}
        <div style={{
          position: 'absolute',
          width: '58vmin', height: '58vmin',
          bottom: 'calc(6vh - 5vmin)', left: 'calc(3vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${c(op.t)} 0%, transparent 62%)`,
          filter: 'blur(32px)',
        }} />
        {/* Quaternary — top-left */}
        <div style={{
          position: 'absolute',
          width: '52vmin', height: '52vmin',
          top: 'calc(12vh - 5vmin)', left: 'calc(4vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${c(op.q)} 0%, transparent 65%)`,
          filter: 'blur(28px)',
        }} />
      </div>

      {/* ── Group C — slow CW drift (60 s) — fills bottom-right & mid voids ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, zIndex,
        animation: 'orbDrift 60s linear infinite',
        transformOrigin: '50% 50%',
        pointerEvents: 'none',
        willChange: 'transform',
      }}>
        {/* Quinary — bottom-right */}
        <div style={{
          position: 'absolute',
          width: '56vmin', height: '56vmin',
          bottom: 'calc(5vh - 5vmin)', right: 'calc(4vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${c(op.r)} 0%, transparent 60%)`,
          filter: 'blur(30px)',
        }} />
        {/* Senary — mid-left */}
        <div style={{
          position: 'absolute',
          width: '46vmin', height: '46vmin',
          top: 'calc(40vh - 5vmin)', left: 'calc(2vw - 5vmin)',
          borderRadius: '50%',
          background: `radial-gradient(circle at 50% 50%, ${c(op.q)} 0%, transparent 62%)`,
          filter: 'blur(26px)',
        }} />
      </div>

      {/* ── Conic shimmer — CCW (18 s) ── */}
      <div aria-hidden style={{
        position: 'absolute', inset: '-20%',
        zIndex,
        background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${c(op.sh)} 90deg, transparent 180deg, ${c(op.sh * 0.7)} 270deg, transparent 360deg)`,
        animation: 'orbCounter 50s linear infinite',
        filter: 'blur(48px)',
        pointerEvents: 'none',
      }} />
    </>
  );
};

