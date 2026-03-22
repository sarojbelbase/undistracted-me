import React, { useState, useEffect, useCallback, useRef } from 'react';
import bgImage from '../assets/img/bg.webp';
import { getTimeParts } from '../widgets/clock/utils';
import {
  getTimeZoneAwareDayJsInstance,
  convertEnglishToNepali,
} from '../utilities';
import { MONTH_NAMES } from '../constants';
import { useEvents, useGoogleCalendar } from '../widgets/useEvents';
import { formatTime } from '../widgets/pomodoro/utils';
import { GearFill, CheckLg, StopwatchFill } from 'react-bootstrap-icons';
import { ACCENT_COLORS } from '../theme';
import { LANGUAGES } from '../constants/settings';
import { useSettingsStore } from '../store';

// ─── Date helpers ────────────────────────────────────────────────────────────

const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getGregorianDate = () => {
  const now = getTimeZoneAwareDayJsInstance();
  return `${ENGLISH_DAYS[now.day()]}, ${GREGORIAN_MONTHS[now.month()]} ${now.date()}, ${now.year()}`;
};

const getBikramSambatDate = () => {
  const now = getTimeZoneAwareDayJsInstance();
  const [year, month, day] = now.format('YYYY M D').split(' ').map(Number);
  const result = convertEnglishToNepali(year, month, day);
  if (result === 'Invalid date!') return result;
  const [ny, nm, nd] = result.split(' ').map(Number);
  return `${ENGLISH_DAYS[now.day()]}, ${MONTH_NAMES[nm - 1]} ${nd}, ${ny} BS`;
};

// ─── Pomodoro reader ─────────────────────────────────────────────────────────

const readPomodoro = () => {
  try {
    const raw = localStorage.getItem('fm_pomodoro');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s.running || s.remaining <= 0) return null;
    return s;
  } catch {
    return null;
  }
};

// ─── Current event finder ────────────────────────────────────────────────────

const getCurrentEvent = (events) => {
  const now = new Date();
  return events.find(e => {
    if (!e.startDate || !e.endDate || !e.startTime || !e.endTime) return false;
    const start = new Date(`${e.startDate}T${e.startTime}`);
    const end = new Date(`${e.endDate}T${e.endTime}`);
    return now >= start && now <= end;
  }) || null;
};

// ─── Settings panel ──────────────────────────────────────────────────────────

const FocusModeSettings = () => {
  const {
    dateFormat, setDateFormat,
    accent, setAccent,
    mode, setMode,
    language, setLanguage,
  } = useSettingsStore();

  const handleSetAccent = (name) => {
    setAccent(name); // store action also calls applyTheme
  };

  const handleSetMode = (m) => {
    setMode(m); // store action handles accent guard + applyTheme
  };

  return (
    <div
      className="absolute right-0 top-11 z-50 flex flex-col gap-4 p-4 w-56 rounded-2xl animate-fade-in"
      style={{
        background: 'rgba(8,9,11,0.86)',
        backdropFilter: 'blur(32px)',
        WebkitBackdropFilter: 'blur(32px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
      }}
      onMouseDown={e => e.stopPropagation()}
      onClick={e => e.stopPropagation()}
    >
      {/* Date format */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Date Calendar
        </p>
        <div className="flex gap-1.5">
          {[{ id: 'gregorian', label: 'Gregorian (CE)' }, { id: 'bikramSambat', label: 'Bikram Sambat' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setDateFormat(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={dateFormat === id
                ? { background: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.92)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {id === 'gregorian' ? 'CE' : 'BS'}
            </button>
          ))}
        </div>
      </div>

      {/* Appearance */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Appearance
        </p>
        <div className="flex gap-1.5">
          {[{ id: 'light', label: 'Light' }, { id: 'dark', label: 'Dark' }].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => handleSetMode(id)}
              className="flex-1 text-[10px] py-1.5 rounded-lg font-medium transition-all focus:outline-none"
              style={mode === id
                ? { background: 'rgba(255,255,255,0.16)', color: 'rgba(255,255,255,0.92)' }
                : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)' }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accent */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Accent
        </p>
        <div className="grid grid-cols-6 gap-1.5">
          {ACCENT_COLORS.map(color => {
            const locked = color.name === 'Default' && mode === 'dark';
            return (
              <button
                key={color.name}
                title={locked ? 'Not available in dark mode' : color.name}
                onClick={() => !locked && handleSetAccent(color.name)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform focus:outline-none"
                style={{
                  backgroundColor: color.hex,
                  outline: accent === color.name ? `2px solid rgba(255,255,255,0.7)` : 'none',
                  outlineOffset: '2px',
                  opacity: locked ? 0.25 : 1,
                  cursor: locked ? 'not-allowed' : 'pointer',
                  transform: accent === color.name ? 'scale(1.12)' : 'scale(1)',
                }}
              >
                {accent === color.name && <CheckLg size={11} style={{ color: color.fg }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(255,255,255,0.26)' }}>
          Nepali Language
        </p>
        <select
          value={language}
          onChange={e => { setLanguage(e.target.value); }}
          className="w-full rounded-lg px-2 py-1.5 text-[10px] outline-none"
          style={{
            backgroundColor: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.6)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          {Object.keys(LANGUAGES).map(k => (
            <option key={k} value={LANGUAGES[k]} style={{ backgroundColor: '#0d0e10', color: '#e5e7eb' }}>
              {k}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

// ─── Odometer digit roller ──────────────────────────────────────────────────
// Strip = 0..9 repeated twice (20 slots). The slot counter only ever increases,
// so the digit always rolls upward (forward). When nearing the strip end we
// instantly teleport back 10 slots (same visual digit, no flash) then continue.

const STRIP = Array.from({ length: 20 }, (_, i) => i % 10);

const DigitRoller = React.memo(({ char }) => {
  const d = parseInt(char, 10);
  const slotRef = useRef(d);
  const [slot, setSlot] = useState(d);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    const prevDigit = slotRef.current % 10;
    if (prevDigit === d) return;

    let step = d - prevDigit;
    if (step <= 0) step += 10; // always roll forward

    const newSlot = slotRef.current + step;

    if (newSlot >= 20) {
      // Teleport back 10 (same visual digit, no animation), then animate to target
      const tp = slotRef.current - 10;
      const tgt = tp + step;
      setInstant(true);
      setSlot(tp);
      slotRef.current = tp;
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setInstant(false);
          setSlot(tgt);
          slotRef.current = tgt;
        })
      );
    } else {
      setInstant(false);
      setSlot(newSlot);
      slotRef.current = newSlot;
    }
  }, [d]);

  return (
    <div
      style={{
        height: '1em',
        overflow: 'hidden',
        lineHeight: 1,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          transform: `translateY(-${slot}em)`,
          transition: instant ? 'none' : 'transform 0.72s cubic-bezier(0.16, 1, 0.3, 1)',
          willChange: 'transform',
          lineHeight: 1,
        }}
      >
        {STRIP.map((digit, i) => (
          <div
            key={i}
            style={{
              height: '1em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {digit}
          </div>
        ))}
      </div>
    </div>
  );
});

// ─── Main export ─────────────────────────────────────────────────────────────

export const FocusMode = ({ onExit }) => {
  const { dateFormat, setDateFormat } = useSettingsStore();
  const [parts, setParts] = useState(() => getTimeParts('24h'));
  const [dateStr, setDateStr] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [pomodoro, setPomodoro] = useState(null);
  const settingsRef = useRef(null);

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const currentEvent = getCurrentEvent([...localEvents, ...gcalEvents]);

  const update = useCallback(() => {
    setParts(getTimeParts('24h'));
    setDateStr(dateFormat === 'gregorian' ? getGregorianDate() : getBikramSambatDate());
    setPomodoro(readPomodoro());
  }, [dateFormat]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [update]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onExit(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onExit]);

  useEffect(() => {
    if (!showSettings) return;
    const handler = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettings]);

  const altLabel = dateFormat === 'gregorian' ? 'BS' : 'CE';
  const hasContext = pomodoro || currentEvent;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
      onClick={onExit}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/36 pointer-events-none" />

      {/* ── Top bar ── */}
      <div
        className="relative z-10 flex items-center justify-between px-10 pt-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Date left + format toggle */}
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-light tracking-[0.04em] select-none"
            style={{ color: 'rgba(255,255,255,0.48)' }}
          >
            {dateStr}
          </span>
          <button
            onClick={() => setDateFormat(f => f === 'gregorian' ? 'bikramSambat' : 'gregorian')}
            className="flex items-center justify-center rounded-md px-1.5 transition-all hover:bg-white/15 focus:outline-none"
            style={{
              height: 18,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'rgba(255,255,255,0.36)',
              fontSize: 8,
              fontWeight: 700,
              letterSpacing: '0.08em',
            }}
          >
            {altLabel}
          </button>
        </div>

        {/* Settings gear — right */}
        <div className="relative" ref={settingsRef}>
          <button
            onClick={() => setShowSettings(s => !s)}
            className="group w-8 h-8 flex items-center justify-center rounded-full transition-all focus:outline-none"
            style={{
              background: showSettings ? 'rgba(255,255,255,0.12)' : 'transparent',
            }}
            title="Settings"
          >
            <GearFill
              size={13}
              className="transition-transform duration-300 group-hover:rotate-90"
              style={{ color: showSettings ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.28)' }}
            />
          </button>
          {showSettings && (
            <FocusModeSettings />
          )}
        </div>
      </div>

      {/* ── Odometer Clock ── */}
      <div
        className="relative z-10 flex items-center justify-center flex-1 select-none"
        onClick={e => e.stopPropagation()}
      >
        <div
          className="flex items-center"
          style={{
            fontSize: 'clamp(8rem, 22vw, 22rem)',
            fontWeight: 700,
            letterSpacing: '-0.025em',
            color: 'white',
            lineHeight: 1,
            textShadow: '0 8px 60px rgba(0,0,0,0.22)',
          }}
        >
          {parts.time.split('').map((char, i) =>
            char === ':' ? (
              <span
                key={i}
                style={{
                  lineHeight: 1,
                  height: '1em',
                  display: 'flex',
                  alignItems: 'center',
                  paddingBottom: '0.05em',
                  color: 'rgba(255,255,255,0.55)',
                  marginInline: '0.01em',
                }}
              >
                :
              </span>
            ) : (
              <DigitRoller key={i} char={char} />
            )
          )}
        </div>
      </div>

      {/* ── Bottom strip ── */}
      <div
        className="relative z-10 flex items-end justify-between px-10 pb-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Bottom-left: greeting */}
        <div className="flex flex-col gap-0.5">
          <span
            className="text-sm font-light tracking-[0.06em] leading-tight"
            style={{ color: 'rgba(255,255,255,0.28)' }}
          >
            {parts.greeting.prefix}
          </span>
          <span
            className="text-base font-medium tracking-[0.04em] leading-tight"
            style={{ color: 'rgba(255,255,255,0.55)' }}
          >
            {parts.greeting.label}
          </span>
        </div>

        {/* Bottom-right: context (pomodoro + event) + esc */}
        <div className="flex flex-col items-end gap-2">
          {hasContext && (
            <div className="flex flex-col items-end gap-1.5">
              {pomodoro && (
                <div className="flex items-center gap-1.5">
                  <StopwatchFill
                    size={10}
                    style={{ color: 'rgba(255,255,255,0.22)' }}
                  />
                  <span
                    className="text-[11px] font-light tabular-nums tracking-[0.05em]"
                    style={{ color: 'rgba(255,255,255,0.32)' }}
                  >
                    {formatTime(pomodoro.remaining)}
                  </span>
                </div>
              )}
              {currentEvent && (
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-1 h-1 rounded-full shrink-0"
                    style={{ background: 'rgba(255,255,255,0.22)' }}
                  />
                  <span
                    className="text-[11px] font-light tracking-[0.04em] max-w-[180px] truncate"
                    style={{ color: 'rgba(255,255,255,0.28)' }}
                  >
                    {currentEvent.title}
                  </span>
                </div>
              )}
            </div>
          )}
          <span
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{ color: 'rgba(255,255,255,0.14)' }}
          >
            esc to exit
          </span>
        </div>
      </div>
    </div>
  );
};


