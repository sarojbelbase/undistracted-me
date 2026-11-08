import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  PlayFill, PauseFill, ArrowCounterclockwise, ArrowLeft,
} from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { PillButton } from '../../components/ui/PillButton';
import { ConfirmButton } from '../../components/ui/ConfirmButton';
import { useRainStream } from '../../hooks/useRainStream';
import { useWidgetSettings } from '../useWidgetSettings';
import { PomodoroSettings } from './Settings';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import {
  PRESETS, PHASE, SESSION_TYPE, DEFAULT_SETTINGS,
} from './constants';
import { formatTime, saveSession, firePomodoroComplete } from './utils';

// ─── Persistence helpers (keyed per widget instance id) ───────────────────
const loadTimer = (id) => {
  // Prefer the freshest running state (`fm_pomodoro`, written every 1s) over the
  // per-widget key (historically written every 5s), so remounting after switching
  // between canvas and Focus Mode never restores stale state and resets the timer.
  try {
    const fmRaw = localStorage.getItem(STORAGE_KEYS.POMODORO);
    if (fmRaw) {
      const fm = JSON.parse(fmRaw);
      if (fm.running && fm.endTime) {
        const remaining = Math.round((fm.endTime - Date.now()) / 1000);
        if (remaining > 0) {
          return {
            phase: fm.sessionType === SESSION_TYPE.BREAK ? PHASE.BREAK : PHASE.TIMER,
            preset: fm.preset,
            duration: fm.total,
            remaining,
            running: true,
            sessionType: fm.sessionType,
          };
        }
      }
    }
  } catch { /* fall through to the per-widget key */ }

  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroTimerState(id)));
    if (!raw?.phase || raw.phase === PHASE.PICK) return null;
    if (raw.running && raw.endTime) {
      const remaining = Math.round((raw.endTime - Date.now()) / 1000);
      // Already reached zero — the session completed while this widget was
      // unmounted. Don't restore a "done" state that would re-fire completion.
      if (remaining <= 0) return null;
      return { ...raw, remaining, running: true };
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
  <BaseWidget className="p-3 flex flex-col items-center justify-center gap-3" onRemove={onRemove} settingsContent={settingsContent} settingsTitle="Pomodoro Settings">
    <div className="text-center">
      <p className="w-heading">Focus Timer</p>
      <p className="w-muted mt-0.5">Pick a duration</p>
    </div>

    <div className="flex flex-col gap-2 w-full items-center">
      <div className="pom-preset-row flex gap-1.5 justify-center flex-wrap">
        {PRESETS.map((p) => (
          <PillButton
            key={p.label}
            active={showCustom && p.secs === null}
            accent
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
  const rainSound = settings.rainSound ?? DEFAULT_SETTINGS.rainSound;
  const {
    play: playRain,
    pause: pauseRain,
    audioRef: rainAudioRef,
    ready: rainReady,
  } = useRainStream(3000);

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
  const pendingSessionRef = useRef(null);
  // Stable ref mirroring `note` so startBreak can read the latest note without
  // changing its own dependency list (which would cancel the auto-break timer).
  const noteRef = useRef('');

  const done = remaining === 0 && (phase === PHASE.TIMER || phase === PHASE.BREAK);
  const isBreak = sessionType === SESSION_TYPE.BREAK;

  // Sync the `rainSound` setting to actual playback — rain follows the *running*
  // countdown, not just the phase. It starts when a session begins counting down
  // and pauses when the timer is paused, then stops when the session completes
  // (done) or you return to pick.
  const rainActive = rainSound && (phase === PHASE.TIMER || phase === PHASE.BREAK) && running && !done;
  useEffect(() => {
    if (!rainReady) return;
    if (rainActive) playRain();
    else pauseRain();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rainActive, rainReady]);

  // ── Start a timer (focus or break) ────────────────────────────────────
  const startTimer = useCallback((secs, label, type = SESSION_TYPE.FOCUS, running = false) => {
    const next = {
      phase: type === SESSION_TYPE.BREAK ? PHASE.BREAK : PHASE.TIMER,
      preset: label,
      duration: secs,
      remaining: secs,
      running,
      sessionType: type,
    };
    saveTimer(id, next);
    setPreset(label);
    setDuration(secs);
    setRemaining(secs);
    setRunning(running);
    setShowCustom(false);
    setNote('');
    noteRef.current = '';
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
    if (!mins || mins <= 0) return;
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
    // Persist the just-completed focus session before the break replaces it, so
    // an auto-start (or a manual "Start break") never silently drops it from
    // history. Captures the note typed during the "Session Complete" state.
    const pending = pendingSessionRef.current;
    if (pending && pending.type === SESSION_TYPE.FOCUS) {
      saveSession({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...pending,
        note: noteRef.current.trim() || '',
      });
      pendingSessionRef.current = null;
    }
    const breakSecs = (breakDuration || 5) * 60;
    // Run immediately — "auto-start" should actually start the countdown, not
    // stage a paused break the user must manually resume.
    startTimer(breakSecs, `${breakDuration || 5}m break`, SESSION_TYPE.BREAK, true);
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
        // Persist the wall-clock end time so Focus Mode can keep the countdown
        // ticking even though this widget is unmounted while FM is active.
        endTime: Date.now() + remaining * 1000,
        total: duration,
        preset,
        sessionType,
        // Carry the settings Focus Mode needs to chime/notify + auto-break on completion.
        soundEnabled,
        autoBreak,
        breakDuration,
      }));
      // Keep the per-widget persist key fresh every second (not just every 5s in
      // the interval) so a remount after switching views never resets the timer.
      saveTimer(id, { phase, preset, duration, remaining, running: true, sessionType });
    } else if (!isTimerPhase || !running || remaining <= 0) {
      localStorage.removeItem(STORAGE_KEYS.POMODORO);
    }
  }, [id, phase, running, remaining, preset, duration, sessionType, soundEnabled, autoBreak, breakDuration]);

  // ── Fire completion side-effects when timer reaches 0 ─────────────────
  useEffect(() => {
    if (!done || completedRef.current) return;
    completedRef.current = true;

    const isFocus = sessionType === SESSION_TYPE.FOCUS;
    // Defer the history write to when the user clicks "Done" so the session
    // note (typed *after* completion) is captured instead of always being "".
    pendingSessionRef.current = {
      preset: preset || 'Custom',
      duration,
      completedAt: Date.now(),
      type: sessionType,
    };

    firePomodoroComplete({ sessionType, preset, soundEnabled });

    // Auto-start the break timer when enabled (focus sessions only).
    if (isFocus && autoBreak) {
      const t = setTimeout(() => startBreak(), 1200);
      return () => clearTimeout(t);
    }
  }, [done, sessionType, preset, duration, soundEnabled, autoBreak, startBreak]);

  // ── Cleanup on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  // ── Callbacks for DoneState ───────────────────────────────────────────
  const handleNoteChange = useCallback((val) => { setNote(val); noteRef.current = val; }, []);
  const handleDone = useCallback(() => {
    // Write the completed session to history now, capturing the note the user
    // typed after the timer finished (see completion effect above).
    if (pendingSessionRef.current) {
      saveSession({
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...pendingSessionRef.current,
        note: note.trim() || '',
      });
      pendingSessionRef.current = null;
    }
    backToPick();
  }, [backToPick, note]);

  // ═══════════════════════════════════════════════════════════════════════
  // PICK PHASE
  // ═══════════════════════════════════════════════════════════════════════
  if (phase === PHASE.PICK) {
    return (
      <>
        {/* NOSONAR: ambient rain audio has no speech/dialogue content */}
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <audio ref={rainAudioRef} loop preload="none" />
        <PickPhase
          showCustom={showCustom}
          customInput={customInput}
          onCustomInputChange={setCustomInput}
          onCustomStart={handleCustomStart}
          onPresetClick={handlePresetClick}
          onRemove={onRemove}
          settingsContent={settingsContent}
        />
      </>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // TIMER / BREAK PHASE
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <BaseWidget className="p-3 flex flex-col gap-1" onRemove={onRemove} settingsContent={settingsContent} settingsTitle="Pomodoro Settings">
      {/* NOSONAR: ambient rain audio has no speech/dialogue content */}
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio ref={rainAudioRef} loop preload="none" />

      {/* ── Top row: back + preset label ─────────────────────────────── */}
      <div className="flex items-center justify-between w-full shrink-0">
        <ConfirmButton
          onConfirm={backToPick}
          label="Back to timer selection"
          className="pom-circle-btn"
          style={{ color: 'var(--w-accent)' }}
        >
          <ArrowLeft size={12} />
        </ConfirmButton>
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
