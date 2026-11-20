/**
 * QuickTour — two-step first-run welcome overlay.
 *
 * Steps:
 *   1. Welcome → brand + the two modes (Focus Mode / Canvas), side by side
 *   2. Features → a 6-card grid of the headline features
 *
 * Gating: shown only on the very first run (quickTourSeenVersion === null).
 * Dismissing writes markQuickTourSeen(TOUR_VERSION) so it never re-appears.
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Fullscreen,
  Grid3x3GapFill,
  UiChecksGrid,
  AlarmFill,
  CloudRainFill,
  Calendar2DateFill,
  CalendarEventFill,
  EyeFill,
  ArrowRight,
  ArrowLeft,
} from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store/useSettingsStore';
import { APP_VERSION } from '../../constants/version';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUR_VERSION = APP_VERSION;

// ─── Feature grid data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: UiChecksGrid,
    title: '17 Widgets',
    desc: 'Clock, calendar, notes, stocks, news and more.',
    color: '#6366f1',
  },
  {
    Icon: AlarmFill,
    title: 'Pomodoro',
    desc: 'Focus timer with breaks, built in.',
    color: '#ef4444',
  },
  {
    Icon: CloudRainFill,
    title: 'Ambient Sounds',
    desc: 'Rain and white noise, one tap.',
    color: '#0ea5e9',
  },
  {
    Icon: Calendar2DateFill,
    title: 'Nepali Calendar',
    desc: 'Bikram Sambat + Gregorian, side by side.',
    color: '#f59e0b',
  },
  {
    Icon: CalendarEventFill,
    title: 'Google Sync',
    desc: 'Calendar, tasks and contacts, on device.',
    color: '#10b981',
  },
  {
    Icon: EyeFill,
    title: 'Look Away',
    desc: 'Dims your screen on a schedule.',
    color: '#8b5cf6',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Step 0 — mode overview */
const StepWelcome = () => (
  <div className="flex flex-col items-center gap-4 text-center">
    {/* Brand mark */}
    <div className="flex flex-col items-center gap-2">
      <div className="w-12 h-12 rounded-2xl flex items-center justify-center qt-brand-icon">
        <img
          src="/favicon/lotus48.png"
          width={26}
          height={26}
          alt=""
          className="qt-brand-lotus"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <h1 className="text-[23px] font-bold tracking-tight leading-tight qt-headline">
          Your new tab, undistracted.
        </h1>
        <p className="text-[12.5px] leading-snug qt-subtitle">
          Focus Mode or Canvas — switch anytime. No account.
        </p>
      </div>
    </div>

    {/* Mode cards */}
    <div className="grid grid-cols-2 gap-3 w-full">
      {/* Focus Mode */}
      <div className="flex flex-col gap-2 p-3 rounded-2xl text-left qt-focus-card">
        <div className="flex flex-col gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center qt-focus-icon-box">
            <Fullscreen size={13} className="qt-focus-icon" />
          </div>
          {/* Mock clock with Nepali date */}
          <div className="flex flex-col gap-0 mt-1">
            <p className="text-[8px] font-semibold tracking-widest uppercase qt-focus-date">
              Baisakh 28
            </p>
            <div className="flex items-end gap-0.5">
              <span className="text-[22px] font-bold leading-none tracking-tighter qt-focus-clock">12</span>
              <span className="text-[15px] font-light leading-none mb-0.5 qt-focus-colon">:</span>
              <span className="text-[22px] font-bold leading-none tracking-tighter qt-focus-clock">34</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-0">
          <p className="text-[11.5px] font-semibold">Focus Mode</p>
          <p className="text-[10px] leading-snug qt-focus-desc">
            Full screen. Clock front and center. No noise.
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {['Pomodoro', 'Rain Sounds', 'Google Tasks'].map(t => (
            <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded-md font-medium qt-focus-chip">
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas Mode */}
      <div className="flex flex-col gap-2 p-3 rounded-2xl text-left qt-canvas-card">
        <div className="flex flex-col gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center qt-canvas-icon-box">
            <Grid3x3GapFill size={13} className="qt-canvas-icon" />
          </div>
          {/* Mini widget grid mockup */}
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                className={`rounded-md ${i % 3 === 0 ? 'qt-canvas-mock-tall' : 'qt-canvas-mock-short'}`}
                style={{ height: i === 0 || i === 3 ? 17 : 11 }}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-0">
          <p className="text-[11.5px] font-semibold qt-canvas-name">Canvas</p>
          <p className="text-[10px] leading-snug qt-canvas-desc">
            Widgets you arrange. Info you actually care about.
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          {['17 Widgets', 'Drag & Drop', 'Nepali Calendar'].map(t => (
            <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded-md font-medium qt-canvas-chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** Step 1 — features showcase */
const StepFeatures = () => (
  <div className="flex flex-col gap-4 flex-1">
    <div className="text-center flex flex-col gap-1">
      <h2 className="text-[21px] font-bold tracking-tight qt-s2-heading">
        Built to keep you undistracted.
      </h2>
      <p className="text-[12.5px] qt-s2-subtitle">
        Everything optional, nothing pulling you in.
      </p>
    </div>

    <div className="flex-1 grid grid-cols-3 grid-rows-2 gap-3">
      {FEATURES.map(({ Icon, title, desc, color }) => (
        <div key={title} className="flex flex-col items-center justify-center gap-1 p-3 text-center rounded-xl qt-feature-card">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: `${color}18`, border: `1px solid ${color}22` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-semibold leading-tight qt-feature-title">{title}</p>
            <p className="text-[9.5px] font-semibold leading-snug tracking-tighter qt-feature-desc">{desc}</p>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export function QuickTour() {
  const quickTourSeenVersion = useSettingsStore(s => s.quickTourSeenVersion);
  const markQuickTourSeen = useSettingsStore(s => s.markQuickTourSeen);

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Animate step change: 'idle' | 'out' | 'in'
  const [stepAnim, setStepAnim] = useState('idle');

  const shouldShow = quickTourSeenVersion === null;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      markQuickTourSeen(TOUR_VERSION);
      setVisible(false);
    }, 280);
  }, [markQuickTourSeen]);

  const goToStep = useCallback((next) => {
    setStepAnim('out');
    setTimeout(() => {
      setStep(next);
      setStepAnim('in');
      setTimeout(() => setStepAnim('idle'), 220);
    }, 180);
  }, []);

  // Mount after a short delay so the app renders first (smooth experience)
  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => { setVisible(true); setExiting(false); }, 600);
    return () => clearTimeout(t);
  }, [shouldShow]);

  // ESC to dismiss, arrow keys to navigate between the two steps
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (step === 0) goToStep(1); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (step === 1) goToStep(0); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, step, dismiss, goToStep]);

  if (!shouldShow || !visible) return null;

  const isLast = step === 1;

  let stepTransform = 'translateY(0)';
  if (stepAnim === 'out') stepTransform = 'translateY(6px)';
  else if (stepAnim === 'in') stepTransform = 'translateY(-4px)';

  const stepStyle = {
    opacity: stepAnim === 'out' ? 0 : 1,
    transform: stepTransform,
    transition: 'opacity 180ms ease, transform 180ms ease',
  };

  const cardStyle = exiting
    ? { opacity: 0, transform: 'scale(0.97) translateY(8px)', transition: 'all 280ms cubic-bezier(0.4,0,1,1)' }
    : { opacity: 1, transform: 'scale(1) translateY(0)', transition: 'all 0ms' };

  return createPortal(
    <dialog
      open
      aria-label="Quick Tour"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
      className="fixed inset-0 m-0 max-w-none max-h-none border-0 flex items-center justify-center p-0 z-9999 qt-overlay"
    >
      {/* Card */}
      <div
        className={`relative flex flex-col w-full mx-4 rounded-2xl overflow-hidden qt-card ${exiting ? '' : 'qt-card--enter'}`}
        style={cardStyle}
      >
        {/* Step content — min-height locks card size between steps */}
        <div className="px-6 pt-6 pb-2 qt-content" style={stepStyle}>
          {step === 0 ? <StepWelcome /> : <StepFeatures />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 qt-footer">
          {/* Back / Skip */}
          {step === 0 ? (
            <button
              type="button"
              onClick={dismiss}
              className="text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-60 qt-skip-btn"
            >
              Skip tour
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(0)}
              className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-70 select-none qt-back-btn"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1].map(i => (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="transition-all rounded-full cursor-pointer qt-dot"
                style={{
                  width: i === step ? 16 : 6,
                  background: i === step ? 'var(--w-accent)' : 'var(--w-border)',
                }}
              />
            ))}
          </div>

          {/* Next / Finish */}
          {isLast ? (
            <button
              type="button"
              onClick={dismiss}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-opacity hover:opacity-90 select-none qt-cta-btn"
            >
              Get started
              <ArrowRight size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-opacity hover:opacity-90 select-none qt-cta-btn"
            >
              What's inside
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
