/**
 * QuickTour — Two-step onboarding overlay shown once per major version.
 *
 * Gating logic:
 *   Show when  → useSettingsStore.quickTourSeenVersion !== TOUR_VERSION
 *   Dismiss by → markQuickTourSeen(TOUR_VERSION) — persisted in Zustand, never shown again for this version
 *   Next ver   → bump TOUR_VERSION to '4.0.0' when ready
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Fullscreen,
  Grid3x3GapFill,
  SearchHeartFill,
  UiChecksGrid,
  EyeFill,
  MusicNoteList,
  CalendarEventFill,
  SunFill,
  ArrowRight,
  ArrowLeft,
} from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store/useSettingsStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUR_VERSION = '3.0.0';

// ─── Feature grid data ────────────────────────────────────────────────────────

const FEATURES = [
  {
    Icon: UiChecksGrid,
    title: '15+ Widgets',
    desc: 'Clock, weather, notes, stocks and more. Move anywhere.',
    color: '#6366f1',
  },
  {
    Icon: SearchHeartFill,
    title: 'Smart Search',
    desc: 'Search from Focus Mode. Google, Duck Duck Go.',
    color: '#ec4899',
  },
  {
    Icon: EyeFill,
    title: 'Look Away',
    desc: 'Dims your screen every configured mins. Forces a real break.',
    color: '#10b981',
  },
  {
    Icon: MusicNoteList,
    title: 'Spotify',
    desc: 'See what is playing. Skip tracks. No tab switching.',
    color: '#1db954',
  },
  {
    Icon: CalendarEventFill,
    title: 'Google Sync',
    desc: 'Calendar, tasks, contacts and birthdays. Never miss an event.',
    color: '#f59e0b',
  },
  {
    Icon: SunFill,
    title: 'Auto Theme',
    desc: 'Light at sunrise. Dark at sunset. Zero config.',
    color: '#f97316',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Step 1 — Mode overview */
const Step1 = () => (
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
          Focus Mode or Canvas Mode. Switch anytime.
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
          {['Ambient Clock', 'Rain Sounds', 'Live Panels'].map(t => (
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
          {['15+ Widgets', 'Drag & Drop', 'Custom Wallpapers'].map(t => (
            <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded-md font-medium qt-canvas-chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

/** Step 2 — Features showcase */
const Step2 = () => (
  <div className="flex flex-col gap-4 flex-1">
    <div className="text-center flex flex-col gap-1">
      <h2 className="text-[21px] font-bold tracking-tight qt-s2-heading">
        Built to keep you undistracted.
      </h2>
      <p className="text-[12.5px] qt-s2-subtitle">
        No distractions, just the features that actually help.
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

  const shouldShow = quickTourSeenVersion !== TOUR_VERSION;

  // Mount after a short delay so the app renders first (smooth experience)
  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(t);
  }, [shouldShow]);

  // ESC to dismiss
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === 'Escape') dismiss(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

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
      className="fixed inset-0 m-0 max-w-none max-h-none border-0 flex items-center justify-center p-0 z-9999 qt-overlay"
    >
      {/* Card */}
      <div
        className={`relative flex flex-col w-full mx-4 rounded-2xl overflow-hidden qt-card ${exiting ? '' : 'qt-card--enter'}`}
        style={cardStyle}
      >

        {/* Step content — min-height locks card size between steps */}
        <div className="px-6 pt-6 pb-2 qt-content" style={stepStyle}>
          {step === 0 ? <Step1 /> : <Step2 />}
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
