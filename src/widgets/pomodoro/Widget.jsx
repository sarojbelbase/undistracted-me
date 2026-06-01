import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  PlayFill, PauseFill, ArrowCounterclockwise, ArrowLeft,
} from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { PillButton } from '../../components/ui/PillButton';
import { sendToServiceWorker } from '../../utilities/chrome';
import { useRainStream } from '../../hooks/useRainStream';
import { useWidgetSettings } from '../useWidgetSettings';
import { PomodoroSettings } from './Settings';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {
  PRESETS, PHASE, SESSION_TYPE, DEFAULT_SETTINGS,
} from './constants';
import { formatTime, saveSession } from './utils';
import { playChime, playBreakChime } from './chime';

// ─── Persistence helpers (keyed per widget instance id) ───────────────────
const loadTimer = (id) => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroTimerState(id)));
    if (!raw?.phase || raw.phase === PHASE.PICK) return null;
    if (raw.running && raw.endTime) {
      const remaining = Math.max(0, Math.round((raw.endTime - Date.now()) / 1000));
      return { ...raw, remaining, running: remaining > 0 };
    }
    return raw;
  } catch { return null; }
};

const saveTimer = (id, state) => {
  if (!state || state.phase === PHASE.PICK) {
    localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState(id));
    return;
  }
  localStorage.setItem(STORAGE_KEYS.pomodoroTimerState(id), JSON.stringify({
    ...state,
    endTime: state.running ? Date.now() + state.remaining * 1000 : undefined,
  }));
};

// ─── Sub-components ──────────────────────────────────────────────────────

/** Done state: completion label, note input, and action buttons. */
const DoneState = React.memo(({ isBreak, note, onNoteChange, autoBreak, breakDuration, onStartBreak, onDone }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 min-h-0 overflow-hidden">
    <p className="pom-timer-done-label">
      {isBreak ? 'Break Complete' : 'Session Complete'}
    </p>
    <textarea
      className="pom-note-input"
      placeholder="What did you accomplish?"
      value={note}
      onChange={(e) => onNoteChange(e.target.value)}
      rows={2}
      aria-label="Session note"
    />
    <div className="flex gap-2 mt-1">
      {!isBreak && autoBreak && (
        <button onClick={onStartBreak} className="pom-action-btn pom-action-btn--primary">
          Start {breakDuration || 5}m Break
        </button>
      )}
      <button onClick={onDone} className="pom-action-btn pom-action-btn--ghost">
        Done
      </button>
    </div>
  </div>
));

/** Pick phase: preset selection + custom input. */
const PickPhase = React.memo(({
  showCustom, customInput, onCustomInputChange, onCustomStart,
  onPresetClick, onRemove, settingsContent,
}) => (
  <BaseWidget className="p-3 flex flex-col items-center justify-center gap-3" onRemove={onRemove} settingsContent={settingsContent} settingsTitle="Pomodoro">
    <div className="text-center">
      <p className="w-heading">Focus Timer</p>
      <p className="w-muted mt-0.5">Pick a duration</p>
    </div>

    <div className="flex flex-col gap-2 w-full items-center">
      <div className="flex gap-1.5 justify-center flex-wrap">
        {PRESETS.map((p) => (
          <PillButton
            key={p.label}
            active={showCustom && p.secs === null}
            tinted
            onClick={() => onPresetClick(p)}
          >
            {p.label}
          </PillButton>
        ))}
      </div>

      {showCustom && (
        <div className="flex items-center gap-2 mt-1">
          <input
            autoFocus
            id="pomodoro-custom"
            name="pomodoro-custom"
            type="number"
            placeholder="Minutes"
            min="1"
            value={customInput}
            onChange={(e) => onCustomInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onCustomStart()}
            className="pom-custom-input"
          />
          <button
            onClick={onCustomStart}
            disabled={!customInput}
            className="pom-custom-start-btn"
          >Start</button>
        </div>
      )}
    </div>
  </BaseWidget>
));

// ─── Widget ──────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  // ── Settings ──────────────────────────────────────────────────────────
  const [settings] = useWidgetSettings(id, DEFAULT_SETTINGS);

  const soundEnabled = settings.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled;
  const autoBreak = settings.autoBreak ?? DEFAULT_SETTINGS.autoBreak;
  const breakDuration = settings.breakDuration ?? DEFAULT_SETTINGS.breakDuration;

  // ── Settings modal content ────────────────────────────────────────────
  const settingsContent = useMemo(
    () => (onClose) => <PomodoroSettings id={id} onClose={onClose} />, // NOSONAR
    [id]
  );

  // ── Rain stream (hidden — toggled from settings, not widget face) ─────
  const { audioRef: rainAudioRef } = useRainStream(3000);

  // ── Init from localStorage (once) ─────────────────────────────────────
  const initRef = useRef(undefined);
  if (initRef.current === undefined) initRef.current = loadTimer(id);
  const init = initRef.current;

  // ── Timer state ───────────────────────────────────────────────────────
  const [phase, setPhase] = useState(() => init?.phase ?? PHASE.PICK);
  const [preset, setPreset] = useState(() => init?.preset ?? null);
  const [duration, setDuration] = useState(() => init?.duration ?? 0);
  const [remaining, setRemaining] = useState(() => init?.remaining ?? 0);
  const [running, setRunning] = useState(() => init?.running ?? false);
  const [sessionType, setSessionType] = useState(() => init?.sessionType ?? SESSION_TYPE.FOCUS);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [note, setNote] = useState('');
  const intervalRef = useRef(null);
  const lastSaveRef = useRef(0);
  const completedRef = useRef(false);

  const done = remaining === 0 && (phase === PHASE.TIMER || phase === PHASE.BREAK);
  const isBreak = sessionType === SESSION_TYPE.BREAK;

  // ── Start a timer (focus or break) ────────────────────────────────────
  const startTimer = useCallback((secs, label, type = SESSION_TYPE.FOCUS) => {
    const next = {
      phase: type === SESSION_TYPE.BREAK ? PHASE.BREAK : PHASE.TIMER,
      preset: label,
      duration: secs,
      remaining: secs,
      running: false,
      sessionType: type,
    };
    saveTimer(id, next);
    setPreset(label);
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
    setShowCustom(false);
    setNote('');
    setSessionType(type);
    setPhase(next.phase);
    completedRef.current = false;
  }, [id]);

  // ── Preset click handler ──────────────────────────────────────────────
  const handlePresetClick = useCallback((p) => {
    if (p.secs === null) { setShowCustom((s) => !s); return; }
    startTimer(p.secs, p.label);
  }, [startTimer]);

  // ── Custom timer start ────────────────────────────────────────────────
  const handleCustomStart = useCallback(() => {
    const mins = Number.parseFloat(customInput);
    if (!mins) return;
    startTimer(Math.round(mins * 60), `${mins}m`);
    setCustomInput('');
  }, [customInput, startTimer]);

  // ── Reset current timer ───────────────────────────────────────────────
  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(duration);
    saveTimer(id, {
      phase, preset, duration, remaining: duration, running: false, sessionType,
    });
  }, [id, phase, preset, duration, sessionType]);

  // ── Back to pick ──────────────────────────────────────────────────────
  const backToPick = useCallback(() => {
    setRunning(false);
    setPhase(PHASE.PICK);
    setShowCustom(false);
    setNote('');
    completedRef.current = false;
    localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState(id));
  }, [id]);

  // ── Start break (after focus session completes) ───────────────────────
  const startBreak = useCallback(() => {
    const breakSecs = (breakDuration || 5) * 60;
    startTimer(breakSecs, `${breakDuration || 5}m break`, SESSION_TYPE.BREAK);
  }, [breakDuration, startTimer]);

  // ── Timer tick effect ─────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running && !done) {
      intervalRef.current = setInterval(() => {
        setRemaining((r) => {
          const next = r <= 1 ? 0 : r - 1;
          if (next === 0) {
            setRunning(false);
            localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState(id));
          } else if (next % 5 === 0 && next !== lastSaveRef.current) {
            lastSaveRef.current = next;
            saveTimer(id, {
              phase, preset, duration, remaining: next, running: true, sessionType,
            });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, done, phase, preset, duration, sessionType, id]);

  // ── Persist timer state + sync to Focus Mode ─────────────────────────
  useEffect(() => {
    const isTimerPhase = phase === PHASE.TIMER || phase === PHASE.BREAK;

    // Persist pause state
    if (isTimerPhase && !running && remaining > 0) {
      saveTimer(id, {
        phase, preset, duration, remaining, running: false, sessionType,
      });
    }

    // Sync running state to Focus Mode
    if (isTimerPhase && running && remaining > 0) {
      localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify({
        running: true,
        remaining,
        total: duration,
        preset,
        sessionType,
      }));
    } else if (!isTimerPhase || !running || remaining <= 0) {
      localStorage.removeItem(STORAGE_KEYS.POMODORO);
    }
  }, [id, phase, running, remaining, preset, duration, sessionType]);

  // ── Fire completion side-effects when timer reaches 0 ─────────────────
  useEffect(() => {
    if (!done || completedRef.current) return;
    completedRef.current = true;

    const isFocus = sessionType === SESSION_TYPE.FOCUS;
    saveSession({
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      preset: preset || 'Custom',
      duration,
      completedAt: Date.now(),
      note: note.trim() || '',
      type: sessionType,
    });

    if (soundEnabled) {
      if (isFocus) playChime();
      else playBreakChime();
    }
    if (isFocus) {
      sendToServiceWorker({ type: 'POMODORO_DONE', preset });
    }
  }, [done, sessionType, preset, duration, note, soundEnabled]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Callbacks for DoneState ───────────────────────────────────────────
  const handleNoteChange = useCallback((val) => setNote(val), []);
  const handleDone = useCallback(() => backToPick(), [backToPick]);

  // ═══════════════════════════════════════════════════════════════════════
  // PICK PHASE
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === PHASE.PICK) {
    return (
      <PickPhase
        showCustom={showCustom}
        customInput={customInput}
        onCustomInputChange={setCustomInput}
        onCustomStart={handleCustomStart}
        onPresetClick={handlePresetClick}
        onRemove={onRemove}
        settingsContent={settingsContent}
      />
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TIMER / BREAK PHASE
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <BaseWidget className="p-3 flex flex-col gap-1" onRemove={onRemove} settingsContent={settingsContent} settingsTitle="Pomodoro">
      {/* NOSONAR: ambient rain audio has no speech/dialogue content */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={rainAudioRef} loop preload="none" />

      {/* ── Top row: back + preset label ─────────────────────────────── */}
      <div className="flex items-center justify-between w-full shrink-0">
        <button onClick={backToPick} className="pom-circle-btn" aria-label="Back to timer selection">
          <ArrowLeft size={12} />
        </button>
        <span
          className="pom-preset-pill"
          style={isBreak ? {
            background: 'color-mix(in srgb, var(--w-ink-3) 12%, transparent)',
            color: 'var(--w-ink-3)',
            border: '1px solid color-mix(in srgb, var(--w-ink-3) 22%, transparent)',
          } : undefined}
        >
          {preset}
        </span>
        <div className="w-7" />
      </div>

      {/* ── Center: countdown, or done state ────────────────────────── */}
      {done ? (
        <DoneState
          isBreak={isBreak}
          note={note}
          onNoteChange={handleNoteChange}
          autoBreak={autoBreak}
          breakDuration={breakDuration}
          onStartBreak={startBreak}
          onDone={handleDone}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
          <span
            className="pom-timer-countdown"
            style={{
              fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
              color: 'var(--w-ink-1)',
            }}
          >
            {formatTime(remaining)}
          </span>
        </div>
      )}

      {/* ── Bottom row: reset + play/pause ──────────────────────────── */}
      {!done && (
        <div className="flex items-center justify-between w-full shrink-0 pt-0.5 pb-0.5">
          <button onClick={reset} className="pom-circle-btn" aria-label="Reset timer">
            <ArrowCounterclockwise size={13} />
          </button>
          <button
            onClick={() => setRunning((r) => !r)}
            className="pom-play-btn"
            aria-label={running ? 'Pause timer' : 'Start timer'}
          >
            {running ? <PauseFill size={13} /> : <PlayFill size={13} />}
          </button>
        </div>
      )}
    </BaseWidget>
  );
};
