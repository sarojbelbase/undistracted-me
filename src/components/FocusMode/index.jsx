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
import { GearFill, ArrowsFullscreen, FullscreenExit, MusicNoteBeamed, PauseFill, PlayFill, SkipStartFill, SkipEndFill } from 'react-bootstrap-icons';
import { useSettingsStore } from '../../store';
import { FocusModeSettings } from './Settings';
import { getCurrentPlayback, isSpotifyConnected, setPlayPause, skipNext, skipPrev } from '../../widgets/spotify/utils';
import { API_KEY, getWeatherIcon, getCoords, fetchWeatherByCoords, parseWeather } from '../../widgets/weather/utils.jsx';
import { fetchChart, priceStats, fmtPrice } from '../../widgets/stock/utils';
import { getCurrentPhoto, rotatePhoto, getCachedPhotoSync } from '../../utilities/unsplash';

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

// ─── Shared glass-card style ─────────────────────────────────────────────────

const GLASS_CARD = {
  background: 'rgba(6,7,9,0.56)',
  backdropFilter: 'blur(22px)',
  WebkitBackdropFilter: 'blur(22px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '14px',
};

// ─── Data hooks ───────────────────────────────────────────────────────────────

/** Reads weather widget settings from localStorage and fetches live weather. */
const useFocusWeather = () => {
  const [weather, setWeather] = useState(null);
  useEffect(() => {
    if (!API_KEY) return;
    let location = null, unit = 'metric';
    try {
      const ws = JSON.parse(localStorage.getItem('widgetSettings_weather') || '{}');
      location = ws.location || null;
      unit = ws.unit || 'metric';
    } catch { }
    const load = async () => {
      try {
        let lat, lon;
        if (location) { lat = location.lat; lon = location.lon; }
        else { try { ({ lat, lon } = await getCoords()); } catch { return; } }
        const data = await fetchWeatherByCoords(lat, lon, unit);
        setWeather({ ...parseWeather(data), unit });
      } catch { }
    };
    load();
    const id = setInterval(load, 30 * 60_000);
    return () => clearInterval(id);
  }, []);
  return weather;
};

/** Reads stock symbols from widget settings and fetches live chart data. */
const useFocusStocks = () => {
  const [stocks, setStocks] = useState([]);
  useEffect(() => {
    let symbols = [];
    try {
      const direct = JSON.parse(localStorage.getItem('widgetSettings_stock') || 'null');
      if (direct?.symbols?.length) {
        symbols = direct.symbols;
      } else {
        const instances = JSON.parse(localStorage.getItem('widget_instances') || '[]');
        const id = instances.find(i => i.type === 'stock')?.id;
        if (id) {
          const ws = JSON.parse(localStorage.getItem(`widgetSettings_${id}`) || 'null');
          if (ws?.symbols?.length) symbols = ws.symbols;
        }
      }
    } catch { }
    if (!symbols.length) return;
    const load = async () => {
      const results = await Promise.all(symbols.map(s => fetchChart(s).catch(() => null)));
      setStocks(symbols.map((sym, i) => ({ sym, data: results[i] })));
    };
    load();
    const id = setInterval(load, 5 * 60_000);
    return () => clearInterval(id);
  }, []);
  return stocks;
};

/** Loads Unsplash photos with smooth crossfade transitions between slots. */
const useFocusPhoto = () => {
  const [photo, setPhoto] = useState(() => getCachedPhotoSync());
  const [slotA, setSlotA] = useState(() => getCachedPhotoSync()?.regular || null);
  const [slotB, setSlotB] = useState(null);
  const [activeSlot, setActiveSlot] = useState('a');
  const prevUrlRef = useRef(null);

  const applyPhoto = useCallback((p) => {
    if (!p) return;
    const url = p.regular || p.url;
    if (url === prevUrlRef.current) return;
    prevUrlRef.current = url;
    setPhoto(p);
    setActiveSlot(cur => {
      if (cur === 'a') { setSlotB(url); return 'b'; }
      else { setSlotA(url); return 'a'; }
    });
  }, []);

  useEffect(() => {
    let mounted = true;
    getCurrentPhoto().then(p => { if (mounted && p) applyPhoto(p); });
    const id = setInterval(() => {
      if (!mounted) return;
      rotatePhoto().then(p => { if (mounted && p) applyPhoto(p); });
    }, 45 * 60_000);
    return () => { mounted = false; clearInterval(id); };
  }, [applyPhoto]);

  return { photo, slotA, slotB, activeSlot };
};

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Inline weather badge for the top bar: white icon + temp + separator dot */
const WeatherTopBadge = ({ weather }) => {
  if (!weather) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ filter: 'brightness(0) invert(1)', opacity: 0.65, display: 'flex', alignItems: 'center' }}>
        {getWeatherIcon(weather.code, weather.isDay, 14)}
      </div>
      <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.78)', letterSpacing: '-0.01em' }}>
        {weather.temperature}°{weather.unit === 'imperial' ? 'F' : 'C'}
      </span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.2)', marginInline: 1 }}>·</span>
    </div>
  );
};

/** Right-side Spotify card: album art + track info + progress + controls */
const SpotifyPanel = ({ track, onToggle, onNext, onPrev }) => {
  const pct = track.durationMs > 0 ? Math.min((track.progressMs / track.durationMs) * 100, 100) : 0;
  return (
    <div
      style={{ ...GLASS_CARD, padding: 14, width: 192, display: 'flex', flexDirection: 'column', gap: 12 }}
      onClick={e => e.stopPropagation()}
    >
      {track.albumArt
        ? <img src={track.albumArt} alt="" style={{ width: '100%', aspectRatio: '1/1', borderRadius: 10, objectFit: 'cover' }} />
        : (
          <div style={{ width: '100%', aspectRatio: '1/1', borderRadius: 10, background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MusicNoteBeamed size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
          {track.title}
        </div>
        <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,0.32)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {track.artist}
        </div>
      </div>
      <div style={{ height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'var(--w-accent)', width: `${pct.toFixed(1)}%`, transition: 'width 1s linear', opacity: 0.65 }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <button onClick={onPrev} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.32)', padding: 4, display: 'flex' }}>
          <SkipStartFill size={13} />
        </button>
        <button onClick={onToggle} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', color: 'rgba(255,255,255,0.82)', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {track.isPlaying ? <PauseFill size={12} /> : <PlayFill size={13} />}
        </button>
        <button onClick={onNext} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.32)', padding: 4, display: 'flex' }}>
          <SkipEndFill size={13} />
        </button>
      </div>
    </div>
  );
};

/** Left panel — Pomodoro timer card */
const PomodoroPanelCard = ({ pomodoro }) => {
  const pct = pomodoro.total > 0 ? (pomodoro.remaining / pomodoro.total) * 100 : 0;
  return (
    <div style={{ ...GLASS_CARD, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
        Focus{pomodoro.preset ? ` · ${pomodoro.preset}` : ''}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: 'rgba(255,255,255,0.82)', fontVariantNumeric: 'tabular-nums', letterSpacing: '0.04em', marginTop: 5 }}>
        {formatTime(pomodoro.remaining)}
      </div>
      <div style={{ marginTop: 10, height: 2, borderRadius: 2, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: '100%', borderRadius: 2, background: 'var(--w-accent)', width: `${pct.toFixed(1)}%`, transition: 'width 1s linear', opacity: 0.6 }} />
      </div>
    </div>
  );
};

/** Left panel — Upcoming / active event card */
const EventPanelCard = ({ eventInfo }) => {
  const { event, isActive } = eventInfo;
  return (
    <div style={{ ...GLASS_CARD, padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--w-accent)', opacity: isActive ? 0.9 : 0.45, flexShrink: 0, display: 'inline-block' }} />
        <span style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700 }}>
          {isActive ? 'Now' : 'Upcoming'}
        </span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '-0.01em' }}>
        {event.title}
      </div>
      <div style={{ fontSize: 10, marginTop: 3, color: 'rgba(255,255,255,0.28)' }}>
        {isActive ? 'in progress' : getTimeUntilEvent(event)}
        {formatEventStartTime(event) ? ` · ${formatEventStartTime(event)}` : ''}
      </div>
    </div>
  );
};

/** Left panel — Stock tickers card */
const StocksPanelCard = ({ stocks }) => (
  <div style={{ ...GLASS_CARD, padding: '12px 16px' }}>
    <div style={{ fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', fontWeight: 700, marginBottom: 8 }}>
      Stocks
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {stocks.map(({ sym, data }) => {
        const stats = data ? priceStats(data) : null;
        const clr = !stats ? 'rgba(255,255,255,0.3)' : stats.dir === 'up' ? '#4ade80' : stats.dir === 'down' ? '#f87171' : 'rgba(255,255,255,0.4)';
        return (
          <div key={sym} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.58)', letterSpacing: '0.08em' }}>{sym}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.48)', fontVariantNumeric: 'tabular-nums' }}>
                {data ? fmtPrice(data.ltp) : '—'}
              </span>
              {stats && (
                <span style={{ fontSize: 10, color: clr, fontWeight: 600 }}>
                  {stats.dir === 'up' ? '▲' : stats.dir === 'down' ? '▼' : '—'} {Math.abs(stats.pct).toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ─── Depth-overlay mask ───────────────────────────────────────────────────────
const FG_MASK = 'linear-gradient(to bottom, transparent 0%, transparent 26%, rgba(0,0,0,0.38) 46%, rgba(0,0,0,0.86) 64%, black 100%)';

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
  const [spotifyProgress, setSpotifyProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [uiVisible, setUiVisible] = useState(true);
  const hideTimerRef = useRef(null);
  const settingsRef = useRef(null);

  const weather = useFocusWeather();
  const stocks = useFocusStocks();
  const { photo, slotA, slotB, activeSlot } = useFocusPhoto();

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

  // Spotify — poll every 5s when connected
  useEffect(() => {
    if (!isSpotifyConnected()) return;
    let cancelled = false;
    const fetchSpotify = async () => {
      try {
        const data = await getCurrentPlayback();
        if (cancelled) return;
        if (!data?.item) { setSpotify(null); return; }
        const p = {
          isPlaying: data.is_playing,
          title: data.item.name,
          artist: data.item.artists.map(a => a.name).join(', '),
          albumArt: data.item.album.images[0]?.url ?? null,
          durationMs: data.item.duration_ms,
          progressMs: data.progress_ms ?? 0,
        };
        setSpotify(p);
        setSpotifyProgress(p.progressMs);
      } catch {
        if (!cancelled) setSpotify(null);
      }
    };
    fetchSpotify();
    const id = setInterval(fetchSpotify, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Smooth local progress tick between Spotify polls
  useEffect(() => {
    if (!spotify?.isPlaying) return;
    const id = setInterval(() => setSpotifyProgress(p => Math.min(p + 1000, spotify.durationMs || p)), 1000);
    return () => clearInterval(id);
  }, [spotify?.isPlaying, spotify?.durationMs]);

  const handleSpotifyToggle = useCallback(async () => {
    if (!spotify) return;
    try { await setPlayPause(!spotify.isPlaying); setSpotify(s => s ? { ...s, isPlaying: !s.isPlaying } : s); } catch { }
  }, [spotify]);

  const refreshSpotifyTrack = useCallback(async () => {
    try {
      const data = await getCurrentPlayback();
      if (data?.item) {
        const p = { isPlaying: data.is_playing, title: data.item.name, artist: data.item.artists.map(a => a.name).join(', '), albumArt: data.item.album.images[0]?.url ?? null, durationMs: data.item.duration_ms, progressMs: data.progress_ms ?? 0 };
        setSpotify(p); setSpotifyProgress(p.progressMs);
      }
    } catch { }
  }, []);

  const handleSpotifyNext = useCallback(async () => {
    try { await skipNext(); setTimeout(refreshSpotifyTrack, 500); } catch { }
  }, [refreshSpotifyTrack]);

  const handleSpotifyPrev = useCallback(async () => {
    try { await skipPrev(); setTimeout(refreshSpotifyTrack, 500); } catch { }
  }, [refreshSpotifyTrack]);

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
        if (settingsRef.current && !settingsRef.current.contains(e.target)) setShowSettings(false);
      };
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => { clearTimeout(id); if (handler) document.removeEventListener('mousedown', handler); };
  }, [showSettings]);

  const fadeIn = (e) => { e.currentTarget.style.opacity = '0.88'; };
  const fadeOut = (e) => { e.currentTarget.style.opacity = '0.38'; };

  const leftHasContent = pomodoro || eventInfo || stocks.length > 0;
  const spotifyTrack = spotify ? { ...spotify, progressMs: spotifyProgress } : null;
  const photoColor = photo?.color || '#18191b';

  const bgStyle = { position: 'absolute', inset: 0, backgroundSize: 'cover', backgroundPosition: 'center' };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: photoColor }}
      onClick={onExit}
    >
      {/* ── Background photo — two slots for crossfade (z 0/1) ── */}
      <div style={{ ...bgStyle, zIndex: 0, backgroundImage: slotA ? `url(${slotA})` : `url(${bgImage})`, opacity: activeSlot === 'a' ? 1 : 0, transition: 'opacity 2.5s ease' }} />
      <div style={{ ...bgStyle, zIndex: 1, backgroundImage: slotB ? `url(${slotB})` : 'none', opacity: activeSlot === 'b' ? 1 : 0, transition: 'opacity 2.5s ease' }} />

      {/* ── Cinematic vignette (z 2) ── */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.28) 0%, transparent 28%, transparent 62%, rgba(0,0,0,0.42) 100%)',
      }} />

      {/* ── Clock digits — between bg and foreground depth layer (z 10) ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
        style={{ zIndex: 10 }}
      >
        <div className="flex items-start">
          <div
            className="flex items-center"
            style={{
              fontSize: 'clamp(5.5rem, 14vw, 17rem)',
              fontWeight: 700,
              letterSpacing: '-0.04em',
              color: 'rgba(255,255,255,0.88)',
              lineHeight: 1,
              textShadow: '0 2px 32px rgba(0,0,0,0.22)',
            }}
          >
            {parts.time.split('').map((char, i) =>
              char === ':' ? (
                <span
                  key={i}
                  style={{
                    lineHeight: 1, height: '1em', display: 'flex', alignItems: 'center',
                    paddingBottom: '0.05em', color: 'var(--w-accent)', marginInline: '0.015em', opacity: 0.9,
                  }}
                >:</span>
              ) : (
                <DigitRoller key={i} char={char} />
              )
            )}
          </div>
          {parts.period && (
            <span style={{
              fontSize: 'clamp(1.2rem, 2.8vw, 4rem)', fontWeight: 300,
              color: 'rgba(255,255,255,0.32)', lineHeight: 1,
              paddingTop: '0.5em', paddingLeft: '0.25em', letterSpacing: '0.06em',
            }}>
              {parts.period}
            </span>
          )}
        </div>
      </div>

      {/* ── Foreground depth overlay — text-behind-image illusion (z 15) ── */}
      {(slotA || slotB) && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 15, pointerEvents: 'none',
          backgroundImage: activeSlot === 'a'
            ? (slotA ? `url(${slotA})` : undefined)
            : (slotB ? `url(${slotB})` : undefined),
          backgroundSize: 'cover', backgroundPosition: 'center',
          WebkitMaskImage: FG_MASK, maskImage: FG_MASK,
        }} />
      )}

      {/* ── Greeting — above depth overlay (z 20) ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center select-none pointer-events-none"
        style={{ zIndex: 20 }}
      >
        <div style={{ height: 'clamp(5.5rem, 14vw, 17rem)', flexShrink: 0 }} />
        <div className="flex items-baseline gap-2 mt-5">
          <span style={{ fontSize: '1.2rem', fontWeight: 500, letterSpacing: '0.04em', color: 'rgba(255,255,255,0.28)' }}>
            {parts.greeting.prefix}
          </span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600, letterSpacing: '0.03em', color: 'var(--w-accent)', opacity: 0.78 }}>
            {parts.greeting.label}
          </span>
        </div>
      </div>

      {/* ── Left panel: Pomodoro + Event + Stocks (z 22) ── */}
      {leftHasContent && (
        <div
          className="absolute flex flex-col gap-2.5 pointer-events-auto"
          style={{ left: 32, top: '50%', transform: 'translateY(-52%)', zIndex: 22, width: 200 }}
          onClick={e => e.stopPropagation()}
        >
          {pomodoro && <PomodoroPanelCard pomodoro={pomodoro} />}
          {eventInfo && <EventPanelCard eventInfo={eventInfo} />}
          {stocks.length > 0 && <StocksPanelCard stocks={stocks} />}
        </div>
      )}

      {/* ── Right panel: Spotify (z 22) ── */}
      {spotifyTrack && (
        <div
          className="absolute pointer-events-auto"
          style={{ right: 32, top: '50%', transform: 'translateY(-52%)', zIndex: 22 }}
          onClick={e => e.stopPropagation()}
        >
          <SpotifyPanel
            track={spotifyTrack}
            onToggle={handleSpotifyToggle}
            onNext={handleSpotifyNext}
            onPrev={handleSpotifyPrev}
          />
        </div>
      )}

      {/* ── Top bar (z 30) ── */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 pt-5"
        style={{
          zIndex: 30,
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
          style={{ padding: '5px 12px 5px 9px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(12px)', opacity: 0.38, transition: 'opacity 0.2s' }}
          title="Back to Canvas"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M6.5 2L3.5 5L6.5 8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-medium tracking-wide select-none" style={{ color: 'rgba(255,255,255,0.85)' }}>Canvas</span>
        </button>

        {/* Center: Weather · Date */}
        <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-0 select-none pointer-events-none">
          <WeatherTopBadge weather={weather} />
          <span style={{ fontSize: 15, fontWeight: 500, letterSpacing: '0.01em', color: 'rgba(255,255,255,0.72)' }}>
            {dateParts.dow}, {dateParts.month} {dateParts.day}
          </span>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.22)', marginLeft: 7 }}>
            {dateParts.year}
          </span>
        </div>

        {/* Right: Fullscreen + Settings */}
        <div className="relative flex items-center" ref={settingsRef} onClick={e => e.stopPropagation()}>
          <div className="flex items-center rounded-full" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', backdropFilter: 'blur(16px)' }}>
            <button
              onClick={toggleFullscreen}
              onMouseEnter={fadeIn}
              onMouseLeave={fadeOut}
              className="p-2.5 rounded-full focus:outline-none"
              style={{ opacity: 0.38, transition: 'opacity 0.2s' }}
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen — keeps screen awake'}
            >
              {isFullscreen ? <FullscreenExit size={13} style={{ color: 'rgba(255,255,255,0.9)' }} /> : <ArrowsFullscreen size={12} style={{ color: 'rgba(255,255,255,0.9)' }} />}
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
              <GearFill size={13} className="transition-transform duration-300 group-hover:rotate-90" style={{ color: 'rgba(255,255,255,0.9)' }} />
            </button>
          </div>
          {showSettings && <FocusModeSettings onRotatePhoto={rotatePhoto} />}
        </div>
      </div>

      {/* ── Photo attribution (z 20) ── */}
      {photo?.author && (
        <div className="absolute bottom-3 right-4 pointer-events-auto" style={{ zIndex: 20 }} onClick={e => e.stopPropagation()}>
          <a
            href={photo.photoUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.03em', textDecoration: 'none' }}
          >
            {photo.author} · Unsplash
          </a>
        </div>
      )}
    </div>
  );
};
