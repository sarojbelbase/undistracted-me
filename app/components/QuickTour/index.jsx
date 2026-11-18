/**
 * QuickTour — first-run setup flow (actionable onboarding).
 *
 * Steps:
 *   0. Welcome  → brand + the two modes (Focus Mode / Canvas)
 *   1. Pack     → pick a starter pack (Minimal / Student / Developer / Nepal)
 *   2. Location → set your location (auto-detect or keep default)
 *   3. Block    → one-click social-media block preset
 *   4. Task     → add one "thing" for today
 *
 * "Finish" applies the pack, the social block and the task, then dismisses.
 * Gating: shown only on the very first run (quickTourSeenVersion === null).
 */

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Fullscreen,
  Grid3x3GapFill,
  ArrowRight,
  ArrowLeft,
} from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useLocationStore } from '../../store/useLocationStore';
import { APP_VERSION } from '../../constants/version';
import {
  PACK_LIST,
  applyPack,
  blockSocialDefaults,
  addTaskToday,
  SOCIAL_BLOCK_DEFAULTS,
} from '../../utilities/packs';

const TOUR_VERSION = APP_VERSION;

// Step count for the dot indicator.
const STEP_COUNT = 5;

// ─── Step 0 — Welcome ─────────────────────────────────────────────────────────

const StepWelcome = () => (
  <div className="flex flex-col items-center gap-4 text-center">
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
          Focus Mode or Canvas — switch anytime. No account, no tracking.
        </p>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3 w-full">
      <div className="flex flex-col gap-2 p-3 rounded-2xl text-left qt-focus-card">
        <div className="flex flex-col gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center qt-focus-icon-box">
            <Fullscreen size={13} className="qt-focus-icon" />
          </div>
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
          {['Pomodoro', 'Rain Sounds', 'Google Tasks'].map((t) => (
            <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded-md font-medium qt-focus-chip">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3 rounded-2xl text-left qt-canvas-card">
        <div className="flex flex-col gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center qt-canvas-icon-box">
            <Grid3x3GapFill size={13} className="qt-canvas-icon" />
          </div>
          <div className="grid grid-cols-3 gap-1 mt-1.5">
            {[0, 1, 2, 3, 4, 5].map((i) => (
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
          {['17 Widgets', 'Drag & Drop', 'Nepali Calendar'].map((t) => (
            <span key={t} className="text-[9.5px] px-1.5 py-0.5 rounded-md font-medium qt-canvas-chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ─── Step 1 — Pack picker ─────────────────────────────────────────────────────

const PACK_EMOJI = { minimal: '🌿', student: '🎓', developer: '⌨️', nepal: '🏔️' };

const StepPack = ({ selected, onSelect }) => (
  <div className="flex flex-col gap-4 flex-1">
    <div className="text-center flex flex-col gap-1">
      <h2 className="text-[21px] font-bold tracking-tight qt-headline">
        Pick your starting point.
      </h2>
      <p className="text-[12.5px] qt-subtitle">
        A few widgets tuned to how you work. Change anything later.
      </p>
    </div>

    <div className="grid grid-cols-2 gap-3">
      {PACK_LIST.map((p) => {
        const active = selected === p.id;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            aria-pressed={active}
            className={`qt-pack-card ${active ? 'qt-pack-card--selected' : ''} flex flex-col items-start gap-1.5 p-3 rounded-2xl text-left cursor-pointer`}
          >
            <span className="text-[20px] leading-none" aria-hidden="true">
              {PACK_EMOJI[p.id] || '✨'}
            </span>
            <span className="flex flex-col gap-0">
              <span className="text-[13px] font-semibold qt-headline">{p.label}</span>
              <span className="text-[10.5px] leading-snug qt-subtitle">{p.tagline}</span>
            </span>
          </button>
        );
      })}
    </div>
  </div>
);

// ─── Step 2 — Location ────────────────────────────────────────────────────────

const StepLocation = ({ onDetect }) => {
  const city = useLocationStore((s) => s.city);
  const status = useLocationStore((s) => s.status);
  const busy = status === 'loading';

  return (
    <div className="flex flex-col gap-4 flex-1 items-center justify-center text-center">
      <div className="flex flex-col gap-1">
        <h2 className="text-[21px] font-bold tracking-tight qt-headline">
          Where are you?
        </h2>
        <p className="text-[12.5px] qt-subtitle">
          Drives weather, sunrise and the auto theme. Nothing is sent anywhere.
        </p>
      </div>

      <div className="qt-loc-card flex flex-col items-center gap-2 px-5 py-4 rounded-2xl w-full max-w-[280px]">
        <span className="text-[22px]" aria-hidden="true">📍</span>
        <p className="text-[13px] font-semibold qt-headline">
          {busy ? 'Detecting…' : city || 'Not set yet'}
        </p>
        <button
          type="button"
          onClick={onDetect}
          disabled={busy}
          className="qt-loc-btn px-3.5 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer disabled:opacity-60"
        >
          {busy ? 'Detecting…' : city ? 'Refresh location' : 'Use my location'}
        </button>
      </div>
    </div>
  );
};

// ─── Step 3 — Social block preset ─────────────────────────────────────────────

const StepBlock = ({ enabled, onToggle }) => (
  <div className="flex flex-col gap-4 flex-1 items-center justify-center text-center">
    <div className="flex flex-col gap-1">
      <h2 className="text-[21px] font-bold tracking-tight qt-headline">
        Block the usual suspects.
      </h2>
      <p className="text-[12.5px] qt-subtitle">
        A gentle 30-minute timer. Your blocklist never leaves this device.
      </p>
    </div>

    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onToggle(!enabled)}
      className={`qt-social-toggle flex items-center gap-3 px-4 py-3 rounded-2xl cursor-pointer ${enabled ? 'qt-social-toggle--on' : ''}`}
    >
      <span className="text-[18px]" aria-hidden="true">🛡️</span>
      <span className="flex flex-col items-start text-left">
        <span className="text-[13px] font-semibold qt-headline">Block social media</span>
        <span className="text-[10.5px] qt-subtitle">for 30 minutes</span>
      </span>
      <span
        className="qt-social-switch ml-auto shrink-0"
        aria-hidden="true"
      >
        <span />
      </span>
    </button>

    <div className="flex flex-wrap justify-center gap-1.5">
      {SOCIAL_BLOCK_DEFAULTS.map((d) => (
        <span key={d} className="qt-social-chip text-[10px] px-2 py-0.5 rounded-full">
          {d}
        </span>
      ))}
    </div>
  </div>
);

// ─── Step 4 — One task ────────────────────────────────────────────────────────

const StepTask = ({ value, onChange, onSubmit }) => {
  const submit = (e) => {
    e.preventDefault();
    onSubmit();
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-4 flex-1 items-center justify-center text-center">
      <div className="flex flex-col gap-1">
        <h2 className="text-[21px] font-bold tracking-tight qt-headline">
          What's the one thing today?
        </h2>
        <p className="text-[12.5px] qt-subtitle">
          Just one. It'll be waiting on your dashboard.
        </p>
      </div>

      <input
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Finish the proposal draft"
        aria-label="One thing for today"
        className="qt-task-input w-full max-w-[320px] px-4 py-3 rounded-xl text-[13px] outline-none"
      />
      <p className="text-[10.5px] qt-subtitle">Press Enter to finish. You can skip this.</p>
    </form>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export function QuickTour() {
  const quickTourSeenVersion = useSettingsStore((s) => s.quickTourSeenVersion);
  const markQuickTourSeen = useSettingsStore((s) => s.markQuickTourSeen);

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [stepAnim, setStepAnim] = useState('idle');

  const [selectedPack, setSelectedPack] = useState('minimal');
  const [blockSocials, setBlockSocials] = useState(true);
  const [taskText, setTaskText] = useState('');

  const shouldShow = quickTourSeenVersion === null;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      markQuickTourSeen(TOUR_VERSION);
      setVisible(false);
    }, 280);
  }, [markQuickTourSeen]);

  const finish = useCallback(() => {
    if (selectedPack) applyPack(selectedPack);
    if (blockSocials) blockSocialDefaults();
    if (taskText.trim()) addTaskToday(taskText);
    dismiss();
  }, [selectedPack, blockSocials, taskText, dismiss]);

  const detectLocation = useCallback(() => {
    try {
      useLocationStore.getState().refresh();
    } catch {
      /* ignore */
    }
  }, []);

  const goToStep = useCallback((next) => {
    setStepAnim('out');
    setTimeout(() => {
      setStep(next);
      setStepAnim('in');
      setTimeout(() => setStepAnim('idle'), 220);
    }, 180);
  }, []);

  const next = useCallback(() => {
    if (step === STEP_COUNT - 1) {
      finish();
      return;
    }
    goToStep(step + 1);
  }, [step, finish, goToStep]);

  // Mount after a short delay so the app renders first (smooth experience)
  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => { setVisible(true); setExiting(false); }, 600);
    return () => clearTimeout(t);
  }, [shouldShow]);

  // ESC to dismiss, arrow keys to navigate between steps.
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === 'Escape') { dismiss(); return; }
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { if (step < STEP_COUNT - 1) goToStep(step + 1); return; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (step > 0) goToStep(step - 1); return; }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [visible, step, dismiss, goToStep]);

  if (!shouldShow || !visible) return null;

  const isLast = step === STEP_COUNT - 1;

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
      <div
        className={`relative flex flex-col w-full mx-4 rounded-2xl overflow-hidden qt-card ${exiting ? '' : 'qt-card--enter'}`}
        style={cardStyle}
      >
        <div className="px-6 pt-6 pb-2 qt-content" style={stepStyle}>
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepPack selected={selectedPack} onSelect={setSelectedPack} />}
          {step === 2 && <StepLocation onDetect={detectLocation} />}
          {step === 3 && <StepBlock enabled={blockSocials} onToggle={setBlockSocials} />}
          {step === 4 && (
            <StepTask value={taskText} onChange={setTaskText} onSubmit={finish} />
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-4 qt-footer">
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
              onClick={() => goToStep(step - 1)}
              className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-70 select-none qt-back-btn"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}

          <div className="flex items-center gap-1.5">
            {Array.from({ length: STEP_COUNT }).map((_, i) => (
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

          <button
            type="button"
            onClick={next}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-opacity hover:opacity-90 select-none qt-cta-btn"
          >
            {isLast ? 'Finish' : 'Continue'}
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
