import React, { useState, useEffect, useRef } from 'react';
import { PlayFill, PauseFill, ArrowCounterclockwise, ArrowLeft } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { sendToServiceWorker } from '../../utilities/chrome';
import { PRESETS, formatTime } from './utils';
import { STORAGE_KEYS } from '../../constants/storageKeys';

const pillActive = { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' };
const pillInactive = { backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' };

// ─── Persistence helpers (keyed per widget instance id) ─────────────────────
const loadTimer = (id) => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.pomodoroTimerState(id)));
    if (raw?.phase !== 'timer') return null;
    if (raw.running && raw.endTime) {
      // Compute how much time is left accounting for time elapsed while tab was closed
      const remaining = Math.max(0, Math.round((raw.endTime - Date.now()) / 1000));
      return { ...raw, remaining, running: remaining > 0 };
    }
    return raw; // paused — remaining stored directly
  } catch { return null; }
};

const saveTimer = (id, state) => {
  if (state.phase !== 'timer') { localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState(id)); return; }
  localStorage.setItem(STORAGE_KEYS.pomodoroTimerState(id), JSON.stringify({
    ...state,
    // Store absolute end time when running so elapsed time is recovered on restore
    endTime: state.running ? Date.now() + state.remaining * 1000 : undefined,
  }));
};

export const Widget = ({ id, onRemove }) => {
  // Restore from localStorage exactly once at mount — lazy useState initializers
  // guarantee the function runs only on the first render, never on re-renders.
  const [phase, setPhase] = useState(() => loadTimer(id)?.phase ?? 'pick');
  const [preset, setPreset] = useState(() => loadTimer(id)?.preset ?? null);
  const [duration, setDuration] = useState(() => loadTimer(id)?.duration ?? 0);
  const [remaining, setRemaining] = useState(() => loadTimer(id)?.remaining ?? 0);
  const [running, setRunning] = useState(() => loadTimer(id)?.running ?? false);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const intervalRef = useRef(null);

  const done = remaining === 0 && phase === 'timer';

  const startTimer = (secs, label) => {
    const next = { phase: 'timer', preset: label, duration: secs, remaining: secs, running: false };
    saveTimer(id, next);
    setPreset(label);
    setDuration(secs);
    setRemaining(secs);
    setRunning(false);
    setShowCustom(false);
    setPhase('timer');
  };

  const handlePresetClick = (p) => {
    if (p.secs === null) { setShowCustom(s => !s); return; }
    startTimer(p.secs, p.label);
  };

  const handleCustomStart = () => {
    const mins = Number.parseFloat(customInput);
    if (!mins || mins <= 0) return;
    startTimer(Math.round(mins * 60), `${mins}m`);
    setCustomInput('');
  };

  const reset = () => {
    setRunning(false);
    setRemaining(duration);
    saveTimer(id, { phase: 'timer', preset, duration, remaining: duration, running: false });
  };

  const backToPick = () => {
    setRunning(false);
    setPhase('pick');
    setShowCustom(false);
    localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState(id));
  };

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running && !done) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          const next = r <= 1 ? 0 : r - 1;
          if (next === 0) {
            setRunning(false);
            localStorage.removeItem(STORAGE_KEYS.pomodoroTimerState(id));
            // Notify via service worker so it works even when tab isn't focused
            sendToServiceWorker({ type: 'POMODORO_DONE', preset });
          } else {
            // Refresh persisted endTime every tick so it stays accurate
            saveTimer(id, { phase: 'timer', preset, duration, remaining: next, running: true });
          }
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, done, preset, duration]);

  // Persist pause state (running → false)
  useEffect(() => {
    if (phase === 'timer' && !running && remaining > 0) {
      saveTimer(id, { phase: 'timer', preset, duration, remaining, running: false });
    }
  }, [id, phase, running, remaining, preset, duration]);

  // Sync running state to localStorage so FocusMode can read it
  useEffect(() => {
    if (phase === 'timer' && running && remaining > 0) {
      localStorage.setItem(STORAGE_KEYS.POMODORO, JSON.stringify({
        running: true,
        remaining,
        total: duration,
        preset,
      }));
    } else {
      localStorage.removeItem(STORAGE_KEYS.POMODORO);
    }
  }, [phase, running, remaining, duration, preset]);

  // ─── PICK PHASE ──────────────────────────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <BaseWidget className="p-3 flex flex-col items-center justify-center gap-3" onRemove={onRemove}>
        <div className="text-center">
          <p className="w-heading">Focus Timer</p>
          <p className="w-muted mt-0.5">Pick a duration</p>
        </div>

        <div className="flex flex-col gap-2 w-full items-center">
          <div className="flex gap-1.5 justify-center flex-wrap">
            {PRESETS.map(p => (
              <button
                key={p.label}
                onClick={() => handlePresetClick(p)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={showCustom && p.secs === null ? pillActive : pillInactive}
              >
                {p.label}
              </button>
            ))}
          </div>

          {showCustom && (
            <div className="flex items-center gap-2 mt-1">
              <input
                autoFocus
                type="number"
                placeholder="Minutes"
                min="1"
                value={customInput}
                onChange={e => setCustomInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCustomStart()}
                className="w-20 border rounded-xl px-2 py-1.5 text-xs outline-none text-center"
                style={{ borderColor: 'var(--card-border)', backgroundColor: 'var(--card-bg)', color: 'var(--w-ink-1)' }}
              />
              <button
                onClick={handleCustomStart}
                disabled={!customInput}
                className="px-3 py-1.5 rounded-xl text-xs font-medium disabled:opacity-40"
                style={pillActive}
              >Start</button>
            </div>
          )}
        </div>
      </BaseWidget>
    );
  }

  // ─── TIMER PHASE ──────────────────────────────────────────────────────────────
  return (
    <BaseWidget className="p-3 flex flex-col gap-1" onRemove={onRemove}>
      {/* Top row: back + preset label */}
      <div className="flex items-center justify-between w-full shrink-0">
        <button
          onClick={backToPick}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
        >
          <ArrowLeft size={12} />
        </button>
        <span className="text-xs font-semibold px-3 py-1 rounded-full" style={pillActive}>
          {preset}
        </span>
        <div className="w-7" />
      </div>

      {/* Big countdown — drain mask drains text from right as time passes */}
      <div className="flex-1 flex items-center justify-center min-h-0 overflow-hidden">
        <span
          className="font-bold tabular-nums leading-none select-none"
          style={{
            fontSize: 'clamp(2.4rem, 5vw, 3.8rem)',
            color: done ? 'var(--w-accent)' : 'var(--w-ink-1)',
          }}
        >
          {formatTime(remaining)}
        </span>
      </div>

      {done && (
        <p className="shrink-0 text-center text-[10px] font-semibold tracking-wide" style={{ color: 'var(--w-accent)' }}>
          SESSION COMPLETE
        </p>
      )}

      {/* Controls — bottom left (reset) and bottom right (play/pause) */}
      <div className="flex items-center justify-between w-full shrink-0 pt-0.5 pb-0.5">
        <button
          onClick={reset}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ backgroundColor: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', color: 'var(--w-ink-3)', border: '1px solid var(--card-border)' }}
        >
          <ArrowCounterclockwise size={13} />
        </button>
        <button
          onClick={() => setRunning(r => !r)}
          disabled={done}
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-all disabled:opacity-40 hover:scale-105"
          style={{ backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
        >
          {running ? <PauseFill size={13} /> : <PlayFill size={13} />}
        </button>
      </div>
    </BaseWidget>
  );
};
