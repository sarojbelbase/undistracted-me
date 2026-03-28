import React, { useState, useEffect, useRef } from 'react';
import { PlayFill, PauseFill, ArrowCounterclockwise, ArrowLeft } from 'react-bootstrap-icons';
import { BaseWidget } from '../BaseWidget';
import { PRESETS, formatTime } from './utils';

const pillActive = { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' };
const pillInactive = { backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' };

export const Widget = ({ onRemove }) => {
  const [phase, setPhase] = useState('pick');   // 'pick' | 'timer'
  const [preset, setPreset] = useState(null);
  const [duration, setDuration] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const intervalRef = useRef(null);

  const elapsed = duration > 0 ? (duration - remaining) / duration : 0;
  const done = remaining === 0 && phase === 'timer';

  // Drain mask: bright zone shrinks from right as time elapses.
  // At elapsed=0 → fully bright. At elapsed=1 → fully faded to 15%.
  // Wide feather (±40px) keeps the transition silky — no hard edge.
  const brightPct = (1 - elapsed) * 100;
  const drainMask = `linear-gradient(to right,
    black 0%,
    black calc(${brightPct.toFixed(1)}% - 40px),
    rgba(0,0,0,0.42) ${brightPct.toFixed(1)}%,
    rgba(0,0,0,0.15) calc(${brightPct.toFixed(1)}% + 40px),
    rgba(0,0,0,0.15) 100%
  )`;

  const startTimer = (secs, label) => {
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
    const mins = parseFloat(customInput);
    if (!mins || mins <= 0) return;
    startTimer(Math.round(mins * 60), `${mins}m`);
    setCustomInput('');
  };

  const reset = () => {
    setRunning(false);
    setRemaining(duration);
  };

  const backToPick = () => {
    setRunning(false);
    setPhase('pick');
    setShowCustom(false);
  };

  useEffect(() => {
    clearInterval(intervalRef.current);
    if (running && !done) {
      intervalRef.current = setInterval(() => {
        setRemaining(r => {
          if (r <= 1) {
            setRunning(false);
            // Notify via service worker so it works even when tab isn't focused
            if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
              chrome.runtime.sendMessage({ type: 'POMODORO_DONE', preset });
            }
            return 0;
          }
          return r - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, done, preset]);

  // Sync running state to localStorage so FocusMode can read it
  useEffect(() => {
    if (phase === 'timer' && running && remaining > 0) {
      localStorage.setItem('fm_pomodoro', JSON.stringify({
        running: true,
        remaining,
        total: duration,
        preset,
      }));
    } else {
      localStorage.removeItem('fm_pomodoro');
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
                style={{ borderColor: 'var(--w-border)', backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-1)' }}
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
          style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
          title="Change duration"
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
            maskImage: done || elapsed === 0 ? 'none' : drainMask,
            WebkitMaskImage: done || elapsed === 0 ? 'none' : drainMask,
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
          style={{ backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
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
