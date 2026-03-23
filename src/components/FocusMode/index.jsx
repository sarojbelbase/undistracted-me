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
import { GearFill, ArrowsFullscreen, FullscreenExit, MusicNoteBeamed, PauseFill, PlayFill } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { FocusModeSettings } from './Settings';
import { getCurrentPlayback, isSpotifyConnected, setPlayPause } from '../../widgets/spotify/utils';

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

// ─── Event helpers ────────────────────────────────────────────────────────────

/**
 * Returns { event, isActive } for whichever should be shown:
 * 1. Currently active event (highest priority)
 * 2. Next upcoming event (soonest in the future)
 */
const getNextEventToShow = (events) => {
  const now = new Date();
  const active = events.find(e => {
    if (!e.startDate || !e.endDate || !e.startTime || !e.endTime) return false;
    const start = new Date(`${e.startDate}T${e.startTime}`);
    const end = new Date(`${e.endDate}T${e.endTime}`);
    return now >= start && now <= end;
  });
  if (active) return { event: active, isActive: true };

  const upcoming = events
    .filter(e => {
      if (!e.startDate || !e.startTime) return false;
      return new Date(`${e.startDate}T${e.startTime}`) > now;
    })
    .sort((a, b) =>
      new Date(`${a.startDate}T${a.startTime}`) - new Date(`${b.startDate}T${b.startTime}`)
    );
  if (upcoming.length > 0) return { event: upcoming[0], isActive: false };
  return null;
};

const getTimeUntilEvent = (event) => {
  const start = new Date(`${event.startDate}T${event.startTime}`);
  const diffMs = start - new Date();
  if (diffMs <= 0) return 'now';
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const h = Math.floor(diffMin / 60), m = diffMin % 60;
  return m > 0 ? `in ${h}h ${m}m` : `in ${h}h`;
};

const formatEventStartTime = (event) => {
  if (!event.startTime) return '';
  const [h, min] = event.startTime.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
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

// ─── Spotify mini-player ─────────────────────────────────────────────────────

const SpotifyBar = ({ track, onToggle }) => (
  <div
    className="flex items-center gap-2.5"
    style={{
      background: 'rgba(8,9,11,0.64)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '7px 10px 7px 7px',
      maxWidth: '210px',
    }}
    onClick={e => e.stopPropagation()}
  >
    {track.albumArt
      ? <img src={track.albumArt} alt="" style={{ width: 30, height: 30, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
      : (
        <div style={{ width: 30, height: 30, borderRadius: 6, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <MusicNoteBeamed size={11} style={{ color: 'rgba(255,255,255,0.35)' }} />
        </div>
      )}
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.title}
      </div>
      <div style={{ fontSize: '10px', marginTop: '2px', color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {track.artist}
      </div>
    </div>
    <button
      onClick={onToggle}
      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: 'rgba(255,255,255,0.55)', flexShrink: 0 }}
    >
      {track.isPlaying
        ? <PauseFill size={11} style={{ display: 'block' }} />
        : <PlayFill size={11} style={{ display: 'block' }} />}
    </button>
  </div>
);

// ─── Pomodoro pill ────────────────────────────────────────────────────────────

const PomodoroPill = ({ pomodoro }) => {
  const pct = pomodoro.total > 0 ? (pomodoro.remaining / pomodoro.total) * 100 : 0;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        {pomodoro.preset && (
          <>
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', letterSpacing: '0.14em', textTransform: 'uppercase', fontWeight: 600 }}>
              {pomodoro.preset}
            </span>
            <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-block', flexShrink: 0 }} />
          </>
        )}
        <span style={{ fontSize: '22px', fontWeight: 600, color: 'rgba(255,255,255,0.78)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em' }}>
          {formatTime(pomodoro.remaining)}
        </span>
      </div>
      {/* Drain progress bar */}
      <div style={{ width: '180px', height: '1.5px', borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{
          height: '100%', borderRadius: '2px',
          background: 'var(--w-accent)',
          width: `${pct.toFixed(1)}%`,
          transition: 'width 1s linear',
          opacity: 0.6,
        }} />
      </div>
    </div>
  );
};

// ─── Event line ───────────────────────────────────────────────────────────────

const EventLine = ({ eventInfo }) => {
  const { event, isActive } = eventInfo;
  const timeLabel = formatEventStartTime(event);
  const prefix = isActive ? 'now' : getTimeUntilEvent(event);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{
        width: '5px', height: '5px', borderRadius: '50%',
        background: 'var(--w-accent)', opacity: isActive ? 0.8 : 0.4, flexShrink: 0,
      }} />
      <span style={{
        fontSize: '12px', color: 'rgba(255,255,255,0.42)', fontWeight: 400,
        letterSpacing: '0.03em', maxWidth: '260px',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {event.title}
      </span>
      <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.04em', flexShrink: 0 }}>
        {prefix}{timeLabel ? ` · ${timeLabel}` : ''}
      </span>
    </div>
  );
};

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
  const { dateFormat, clockFormat } = useSettingsStore();
  const fmt = clockFormat || '24h';
  const [parts, setParts] = useState(() => getTimeParts(fmt));
  const [dateParts, setDateParts] = useState(() =>
    dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts()
  );
  const [showSettings, setShowSettings] = useState(false);
  const [pomodoro, setPomodoro] = useState(null);
  const [spotify, setSpotify] = useState(null);
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
  const eventInfo = getNextEventToShow([...localEvents, ...gcalEvents]);

  const update = useCallback(() => {
    setParts(getTimeParts(fmt));
    setDateParts(dateFormat === 'gregorian' ? getGregorianDateParts() : getBikramSambatDateParts());
    setPomodoro(readPomodoro());
  }, [dateFormat, fmt]);

  useEffect(() => {
    update();
    const id = setInterval(update, 1_000);
    return () => clearInterval(id);
  }, [update]);

  // Spotify polling — only when connected, every 5s
  useEffect(() => {
    if (!isSpotifyConnected()) return;
    let cancelled = false;
    const fetchSpotify = async () => {
      try {
        const data = await getCurrentPlayback();
        if (cancelled) return;
        if (!data?.item) { setSpotify(null); return; }
        setSpotify({
          isPlaying: data.is_playing,
          title: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          albumArt: data.item.album.images[0]?.url ?? null,
        });
      } catch {
        if (!cancelled) setSpotify(null);
      }
    };
    fetchSpotify();
    const id = setInterval(fetchSpotify, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const handleSpotifyToggle = useCallback(async () => {
    if (!spotify) return;
    try {
      await setPlayPause(!spotify.isPlaying);
      setSpotify(s => s ? { ...s, isPlaying: !s.isPlaying } : s);
    } catch { }
  }, [spotify]);

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

      {/* ── Center Stage: Clock + Greeting + Context ── */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center select-none pointer-events-none">
        <div
          className="flex flex-col items-center pointer-events-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Odometer clock + AM/PM */}
          <div className="flex items-start">
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

            {/* AM / PM badge for 12h mode */}
            {parts.period && (
              <span
                style={{
                  fontSize: 'clamp(1.4rem, 3vw, 4.2rem)',
                  fontWeight: 300,
                  color: 'rgba(255,255,255,0.38)',
                  lineHeight: 1,
                  paddingTop: '0.48em',
                  paddingLeft: '0.28em',
                  letterSpacing: '0.06em',
                }}
              >
                {parts.period}
              </span>
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

          {/* ─── Context strip: Pomodoro + Event ─── */}
          {(pomodoro || eventInfo) && (
            <div className="flex flex-col items-center gap-3.5 mt-9">
              {pomodoro && <PomodoroPill pomodoro={pomodoro} />}
              {eventInfo && <EventLine eventInfo={eventInfo} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Spotify mini-player — bottom-left ── */}
      {spotify && (
        <div className="absolute bottom-6 left-7 z-20">
          <SpotifyBar track={spotify} onToggle={handleSpotifyToggle} />
        </div>
      )}
    </div>
  );
};
