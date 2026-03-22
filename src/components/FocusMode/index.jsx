import React, { useState, useEffect, useCallback, useRef } from 'react';
import bgImage from '../../assets/img/bg.webp';
import { getTimeParts } from '../../widgets/clock/utils';
import {
  getTimeZoneAwareDayJsInstance,
  convertEnglishToNepali,
} from '../../utilities';
import { MONTH_NAMES } from '../../constants';
import { useEvents, useGoogleCalendar } from '../../widgets/useEvents';
import { formatTime } from '../../widgets/pomodoro/utils';
import { GearFill, StopwatchFill, ArrowsFullscreen, FullscreenExit } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { FocusModeSettings } from './Settings';

// ─── Date helpers ─────────────────────────────────────────────────────────────

const ENGLISH_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const GREGORIAN_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const getGregorianDateParts = () => {
  const now = getTimeZoneAwareDayJsInstance();
  return { dow: ENGLISH_DAYS[now.day()], month: GREGORIAN_MONTHS[now.month()], day: now.date(), year: now.year() };
};

const getBikramSambatDateParts = () => {
  const now = getTimeZoneAwareDayJsInstance();
  const [year, month, day] = now.format('YYYY M D').split(' ').map(Number);
  const result = convertEnglishToNepali(year, month, day);
  if (result === 'Invalid date!') return { dow: ENGLISH_DAYS[now.day()], month: '—', day: 0, year: 0 };
  const [ny, nm, nd] = result.split(' ').map(Number);
  return { dow: ENGLISH_DAYS[now.day()], month: MONTH_NAMES[nm - 1], day: nd, year: ny };
};

// ─── Pomodoro reader ──────────────────────────────────────────────────────────

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

// ─── Current event finder ─────────────────────────────────────────────────────

const getCurrentEvent = (events) => {
  const now = new Date();
  return events.find(e => {
    if (!e.startDate || !e.endDate || !e.startTime || !e.endTime) return false;
    const start = new Date(`${e.startDate}T${e.startTime}`);
    const end = new Date(`${e.endDate}T${e.endTime}`);
    return now >= start && now <= end;
  }) || null;
};

// ─── Odometer digit roller ───────────────────────────────────────────────────

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
    if (step <= 0) step += 10;

    const newSlot = slotRef.current + step;

    if (newSlot >= 20) {
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
    <div style={{ height: '1em', overflow: 'hidden', lineHeight: 1, display: 'flex', flexDirection: 'column' }}>
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

// ─── Wake Lock hook ───────────────────────────────────────────────────────────

const useWakeLock = (active) => {
  const lockRef = useRef(null);
  useEffect(() => {
    if (!active) {
      lockRef.current?.release().catch(() => { });
      lockRef.current = null;
      return;
    }
    const acquire = async () => {
      if (!('wakeLock' in navigator)) return;
      try { lockRef.current = await navigator.wakeLock.request('screen'); } catch { }
    };
    acquire();
    const onVisible = () => { if (document.visibilityState === 'visible') acquire(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lockRef.current?.release().catch(() => { });
      lockRef.current = null;
    };
  }, [active]);
};

// ─── Main export ──────────────────────────────────────────────────────────────

export const FocusMode = ({ onExit }) => {
  const { dateFormat, accent } = useSettingsStore();
  const [parts, setParts] = useState(() => getTimeParts('24h'));
  const [dateParts, setDateParts] = useState(() =>
    dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts()
  );
  const [showSettings, setShowSettings] = useState(false);
  const [pomodoro, setPomodoro] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const settingsRef = useRef(null);

  useWakeLock(isFullscreen);

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const resetHideTimer = useCallback(() => {
    setUiVisible(true);
    clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setUiVisible(false), 3000);
  }, []);

  useEffect(() => {
    if (!isFullscreen) {
      setUiVisible(true);
      clearTimeout(hideTimerRef.current);
      return;
    }
    window.addEventListener('mousemove', resetHideTimer);
    window.addEventListener('mousedown', resetHideTimer);
    resetHideTimer();
    return () => {
      window.removeEventListener('mousemove', resetHideTimer);
      window.removeEventListener('mousedown', resetHideTimer);
      clearTimeout(hideTimerRef.current);
    };
  }, [isFullscreen, resetHideTimer]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
    } else {
      document.exitFullscreen().catch(() => { });
    }
  }, []);

  const [localEvents] = useEvents();
  const { gcalEvents } = useGoogleCalendar();
  const currentEvent = getCurrentEvent([...localEvents, ...gcalEvents]);

  const update = useCallback(() => {
    setParts(getTimeParts('24h'));
    setDateParts(dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts());
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
    let handler = null;
    const id = setTimeout(() => {
      handler = (e) => {
        if (settingsRef.current && !settingsRef.current.contains(e.target)) {
          setShowSettings(false);
        }
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(id);
      if (handler) document.removeEventListener('mousedown', handler);
    };
  }, [showSettings]);

  const hasContext = pomodoro || currentEvent;

  const fadeIn = (e) => { e.currentTarget.style.opacity = '0.88'; };
  const fadeOut = (e) => { e.currentTarget.style.opacity = '0.38'; };

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
      <div className="absolute inset-0 bg-black/42 pointer-events-none" />

      {/* ── Top bar ── */}
      <div
        className="relative z-30 flex items-center justify-between px-7 pt-5"
        style={{
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.7s ease',
          pointerEvents: uiVisible ? 'auto' : 'none',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Left: ← Canvas */}
        <button
          onClick={onExit}
          onMouseEnter={fadeIn}
          onMouseLeave={fadeOut}
          className="flex items-center gap-1.5 rounded-full focus:outline-none"
          style={{
            padding: '5px 12px 5px 9px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.11)',
            backdropFilter: 'blur(12px)',
            opacity: 0.38,
            transition: 'opacity 0.2s',
          }}
          title="Back to Canvas"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6.5 2L3.5 5L6.5 8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Canvas
          </span>
        </button>

        {/* Right: fullscreen | settings */}
        <div
          className="relative flex items-center"
          ref={settingsRef}
          onClick={e => e.stopPropagation()}
        >
          <div
            className="flex items-center rounded-full"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.11)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <button
              onClick={toggleFullscreen}
              onMouseEnter={fadeIn}
              onMouseLeave={fadeOut}
              className="p-2.5 rounded-full focus:outline-none"
              style={{ opacity: 0.38, transition: 'opacity 0.2s' }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen — keeps screen awake'}
            >
              {isFullscreen
                ? <FullscreenExit size={13} style={{ color: 'rgba(255,255,255,0.9)' }} />
                : <ArrowsFullscreen size={12} style={{ color: 'rgba(255,255,255,0.9)' }} />}
            </button>

            <div className="w-px h-3.5 shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }} />

            <button
              onClick={() => setShowSettings(s => !s)}
              onMouseEnter={fadeIn}
              onMouseLeave={e => { e.currentTarget.style.opacity = showSettings ? '0.88' : '0.38'; }}
              className="group p-2.5 rounded-full focus:outline-none"
              style={{ opacity: showSettings ? 0.88 : 0.38, transition: 'opacity 0.2s' }}
              title="Settings"
            >
              <GearFill
                size={13}
                className="transition-transform duration-300 group-hover:rotate-90"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              />
            </button>
          </div>

          {showSettings && <FocusModeSettings />}
        </div>

        {/* Date — centered in the top bar */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex items-baseline gap-2.5 select-none pointer-events-none"
        >
          <span
            className="text-2xl font-semibold tracking-[0.01em]"
            style={{ color: 'rgba(255,255,255,0.78)' }}
          >
            {dateParts.dow}, {dateParts.month} {dateParts.day}
          </span>
          <span
            className="text-sm font-light"
            style={{ color: 'rgba(255,255,255,0.22)' }}
          >
            {dateParts.year}
          </span>
        </div>
      </div>

      {/* ── Center Stage: Clock + Greeting ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center select-none pointer-events-none">
        <div
          className="flex flex-col items-center pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Odometer clock */}
          <div
            className="flex items-center"
            style={{
              fontSize: 'clamp(7rem, 20vw, 20rem)',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              color: 'white',
              lineHeight: 1,
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
                    color: 'var(--w-accent)',
                    marginInline: '0.015em',
                    opacity: 0.9,
                  }}
                >
                  :
                </span>
              ) : (
                <DigitRoller key={i} char={char} />
              )
            )}
          </div>

          {/* Greeting */}
          <div className="flex items-baseline gap-2 mt-5">
            <span
              className="text-2xl font-semibold tracking-[0.04em]"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              {parts.greeting.prefix}
            </span>
            <span
              className="text-2xl font-semibold tracking-[0.03em]"
              style={{ color: 'var(--w-accent)', opacity: 0.85 }}
            >
              {parts.greeting.label}
            </span>
          </div>
        </div>
      </div>

      {/* ── Bottom strip — context info ── */}
      {hasContext && (
        <div
          className="relative z-10 flex items-end justify-end px-8 pb-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex flex-col items-end gap-1">
            {pomodoro && (
              <div className="flex items-center gap-1.5">
                <StopwatchFill size={9} style={{ color: 'var(--w-accent)', opacity: 0.5 }} />
                <span
                  className="text-[11px] font-light tabular-nums tracking-[0.05em]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {formatTime(pomodoro.remaining)}
                </span>
              </div>
            )}
            {currentEvent && (
              <div className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: 'var(--w-accent)', opacity: 0.5 }}
                />
                <span
                  className="text-[11px] font-light tracking-[0.04em] max-w-[200px] truncate"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  {currentEvent.title}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
