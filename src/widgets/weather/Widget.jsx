import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { GeoAlt } from 'react-bootstrap-icons';
import {
  getWeatherIcon,
  getCoords,
  getCoordsFromIP,
  reverseGeocode,
  fetchOpenMeteo,
  parseWeather,
  parseForecast,
} from './utils.jsx';
import { getWeatherQuip, getConditionGroup } from './constants.js';

// ── Weather atmosphere CSS animations (always fresh on module load) ────────────
if (typeof document !== 'undefined') {
  const existing = document.getElementById('w-atmo-kf');
  if (existing) existing.remove();
  const s = document.createElement('style');
  s.id = 'w-atmo-kf';
  s.textContent = [
    '@keyframes wa-sun{0%,100%{transform:scale(1);opacity:.88}50%{transform:scale(1.08);opacity:1}}',
    '@keyframes wa-moon{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}',
    '@keyframes wa-drop{0%{transform:translateY(-22px) rotate(-16deg);opacity:0}8%{opacity:1}85%{opacity:.72}100%{transform:translateY(115px) rotate(-16deg);opacity:0}}',
    '@keyframes wa-flake{0%{transform:translateY(-8px) translateX(0);opacity:0}18%{opacity:.88}78%{opacity:.6}100%{transform:translateY(95px) translateX(9px);opacity:0}}',
    '@keyframes wa-fog-a{0%,100%{transform:translateX(0);opacity:.5}50%{transform:translateX(-16px);opacity:.82}}',
    '@keyframes wa-fog-b{0%,100%{transform:translateX(0);opacity:.36}50%{transform:translateX(13px);opacity:.65}}',
    '@keyframes wa-cloud{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}',
    '@keyframes wa-flash{0%,87%,100%{opacity:0}89%{opacity:.55}90%{opacity:.08}92%{opacity:.42}93%{opacity:0}}',
  ].join('');
  document.head.appendChild(s);
}

// ── Atmospheric visual ────────────────────────────────────────────────────────
// All animations use only transform+opacity (GPU composited). No filter:blur on animated elements.
const WeatherAtmosphere = ({ conditionGroup, isDay }) => {
  const wrap = {
    position: 'absolute', inset: '-16px', pointerEvents: 'none',
    overflow: 'hidden', zIndex: 0, borderRadius: '1rem', contain: 'strict',
  };

  // ── Clear day: warm golden orb peeking from top-right corner
  if (conditionGroup === 'clear' && isDay) {
    return (
      <div style={wrap}>
        {/* wide corona glow */}
        <div style={{
          position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,205,50,.17) 0%, rgba(255,158,12,.07) 46%, transparent 70%)',
          animation: 'wa-sun 6.5s ease-in-out infinite',
        }} />
        {/* bright inner disc */}
        <div style={{
          position: 'absolute', top: -8, right: -8, width: 50, height: 50, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,242,105,.44) 0%, rgba(255,210,55,.18) 55%, transparent 82%)',
          animation: 'wa-sun 6.5s ease-in-out infinite 0.7s',
        }} />
      </div>
    );
  }

  // ── Clear night: crescent + moonlight halo + star cluster (stars = zero-cost box-shadow dots)
  if (conditionGroup === 'clear' && !isDay) {
    return (
      <div style={wrap}>
        {/* moonlight halo */}
        <div style={{
          position: 'absolute', top: -24, right: -24, width: 104, height: 104, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(172,205,255,.26) 0%, rgba(128,168,255,.10) 48%, transparent 72%)',
          animation: 'wa-moon 9s ease-in-out infinite',
        }} />
        {/* crescent disc — inset shadow creates the bite out of the right side */}
        <div style={{
          position: 'absolute', top: 6, right: 8, width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(222,234,255,.92)',
          boxShadow: 'inset 10px -7px 0 rgba(4,8,28,.86)',
          animation: 'wa-moon 9s ease-in-out infinite',
        }} />
        {/* star cluster — spread across upper area, zero animations */}
        <div style={{
          position: 'absolute', top: 8, right: 62, width: 2, height: 2, borderRadius: '50%',
          background: 'rgba(205,222,255,.72)',
          boxShadow: '18px -6px 0 1px rgba(202,218,255,.50), -12px 22px 0 0 rgba(202,218,255,.40), 36px 10px 0 0 rgba(202,218,255,.34), -28px 5px 0 1px rgba(202,218,255,.28), 52px -2px 0 0 rgba(202,218,255,.22)',
        }} />
      </div>
    );
  }

  // ── Rain: 5 gradient streaks, pure transform (GPU composited)
  if (conditionGroup === 'rain') {
    const drops = [
      { r: 8, h: 18, d: '0s', sp: '0.68s' },
      { r: 32, h: 14, d: '0.22s', sp: '0.62s' },
      { r: 62, h: 20, d: '0.08s', sp: '0.74s' },
      { r: 18, h: 15, d: '0.38s', sp: '0.65s' },
      { r: 46, h: 17, d: '0.52s', sp: '0.70s' },
    ];
    return (
      <div style={wrap}>
        {drops.map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: -22 + (i % 3) * -8, right: d.r,
            width: 1.5, height: d.h, borderRadius: 2,
            background: 'linear-gradient(to bottom, transparent, rgba(118,172,238,.72), transparent)',
            animation: `wa-drop ${d.sp} linear ${d.d} infinite`,
          }} />
        ))}
      </div>
    );
  }

  // ── Snow: 4 soft flakes
  if (conditionGroup === 'snow') {
    const flakes = [
      { r: 13, sz: 5, d: '0s', sp: '2.1s' },
      { r: 30, sz: 4, d: '0.55s', sp: '1.78s' },
      { r: 50, sz: 5, d: '0.28s', sp: '2.35s' },
      { r: 21, sz: 3, d: '0.86s', sp: '1.95s' },
    ];
    return (
      <div style={wrap}>
        {flakes.map((f, i) => (
          <div key={i} style={{
            position: 'absolute', top: -9 + (i % 2) * -5, right: f.r,
            width: f.sz, height: f.sz, borderRadius: '50%',
            background: 'rgba(218,234,255,.80)',
            animation: `wa-flake ${f.sp} ease-in-out ${f.d} infinite`,
          }} />
        ))}
      </div>
    );
  }

  // ── Fog: 3 full-width gradient bands that fade at both edges
  if (conditionGroup === 'fog') {
    const bands = [
      { top: '24%', op: .62, dur: '7s', del: '0s', kf: 'wa-fog-a' },
      { top: '46%', op: .44, dur: '9.5s', del: '2.2s', kf: 'wa-fog-b' },
      { top: '68%', op: .28, dur: '8s', del: '1.1s', kf: 'wa-fog-a' },
    ];
    return (
      <div style={wrap}>
        {bands.map((b, i) => (
          <div key={i} style={{
            position: 'absolute', left: 0, right: 0, top: b.top, height: 1,
            background: `linear-gradient(90deg, transparent 0%, rgba(200,208,220,${b.op}) 32%, rgba(200,208,220,${b.op}) 68%, transparent 100%)`,
            boxShadow: `0 0 8px 3px rgba(200,208,220,${b.op * .42})`,
            animation: `${b.kf} ${b.dur} ease-in-out ${b.del} infinite`,
          }} />
        ))}
      </div>
    );
  }

  // ── Thunder: 4 heavy rain streaks + brief double-flash overlay
  if (conditionGroup === 'thunder') {
    const drops = [
      { r: 10, h: 21, d: '0s', sp: '0.57s' },
      { r: 28, h: 17, d: '0.14s', sp: '0.54s' },
      { r: 45, h: 22, d: '0.06s', sp: '0.61s' },
      { r: 20, h: 18, d: '0.28s', sp: '0.58s' },
    ];
    return (
      <div style={wrap}>
        {drops.map((d, i) => (
          <div key={i} style={{
            position: 'absolute', top: -22 + (i % 2) * -9, right: d.r,
            width: 2, height: d.h, borderRadius: 2,
            background: 'linear-gradient(to bottom, transparent, rgba(148,162,235,.78), transparent)',
            animation: `wa-drop ${d.sp} linear ${d.d} infinite`,
          }} />
        ))}
        {/* directional tint on flash — electrical charge fills the frame */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(130deg, rgba(210,220,255,.0) 0%, rgba(210,220,255,.10) 100%)',
          animation: 'wa-flash 4.4s ease-in-out infinite',
        }} />
      </div>
    );
  }

  // ── Cloudy: 3 soft ellipse blobs via radial-gradient (no filter:blur = no off-screen GPU buffers)
  if (conditionGroup === 'cloudy') {
    const blobs = [
      { top: -24, right: -16, w: 105, h: 52, op: .22, dur: '7s', del: '0s' },
      { top: 4, right: 22, w: 70, h: 36, op: .15, dur: '9.5s', del: '2s' },
      { top: -10, right: 48, w: 52, h: 26, op: .10, dur: '6.5s', del: '1s' },
    ];
    return (
      <div style={wrap}>
        {blobs.map((b, i) => (
          <div key={i} style={{
            position: 'absolute', top: b.top, right: b.right,
            width: b.w, height: b.h, borderRadius: '50%',
            background: `radial-gradient(ellipse at center, rgba(178,184,200,${b.op}) 0%, transparent 72%)`,
            animation: `wa-cloud ${b.dur} ease-in-out ${b.del} infinite`,
          }} />
        ))}
      </div>
    );
  }

  return null;
};

// ── Skeleton blocks ───────────────────────────────────────────────────────────

const Bone = ({ width, height, className = '' }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ width, height, backgroundColor: 'var(--w-surface-2)', flexShrink: 0 }}
  />
);

const ExpressiveSkeleton = () => (
  <div className="flex flex-col w-full h-full min-w-0 justify-center" style={{ gap: '0.4rem' }}>
    <Bone width="7rem" height="1.4rem" />
    <Bone width="5.5rem" height="1.1rem" />
    <Bone width="4.5rem" height="1.1rem" />
    <Bone width="6rem" height="1.1rem" className="mt-1" />
    <Bone width="9rem" height="0.75rem" className="mt-1" />
  </div>
);

const SimpleSkeleton = () => (
  <div className="flex flex-col items-center w-full h-full animate-pulse gap-2 justify-center">
    <Bone width="5rem" height="1rem" />
    <Bone width="3rem" height="3rem" className="mt-2" />
    <Bone width="4.5rem" height="0.75rem" className="mt-1" />
  </div>
);

// ── Precipitation probability mini-bar chart ──────────────────────────────────
/**
 * Shows the hourly pop% array that caused a clearing/incoming forecast decision.
 * Active bars (before the event hour) fade proportionally to their pop value;
 * bars after the event are flat — making the transition visually obvious.
 */
const PrecipBars = ({ popSlots, eventHour }) => (
  <div
    className="flex items-end gap-px mt-2"
    style={{ height: '18px' }}
    aria-label="Hourly precipitation probability"
  >
    {popSlots.map((pop, i) => {
      const isActive = i < eventHour;
      return (
        <div
          key={i}
          title={`+${i}h: ${pop}%`}
          style={{
            width: '5px',
            height: `${Math.max(2, Math.round((pop / 100) * 16))}px`,
            borderRadius: '1.5px',
            backgroundColor: isActive ? 'var(--w-ink-3)' : 'var(--w-surface-2)',
            opacity: isActive ? Math.max(0.2, pop / 100) : 1,
          }}
        />
      );
    })}
    <span
      style={{
        fontSize: '0.6rem',
        color: 'var(--w-ink-5)',
        marginLeft: '4px',
        lineHeight: 1,
        alignSelf: 'flex-end',
        whiteSpace: 'nowrap',
      }}
    >
      now → +{popSlots.length - 1}h
    </span>
  </div>
);

// ── Widget ────────────────────────────────────────────────────────────────────

export const Widget = ({ id = 'weather', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { location: null, unit: 'metric', style: 'simple' });
  const { location, unit, style } = settings;
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);

  // Reset to skeleton immediately when location changes so stale city data
  // doesn't remain visible while new data loads.
  const prevLocationRef = useRef(location);

  useEffect(() => {
    if (prevLocationRef.current !== location) {
      setWeather(null);
      setForecast(null);
      setError(null);
    }
    prevLocationRef.current = location;

    setError(null);

    const load = async () => {
      try {
        let lat, lon, resolvedCity = '';

        if (location) {
          ({ lat, lon } = location);
          // Only the first segment before a comma:
          // "Jāwalākhel, Bagmati Province, Nepal" → "Jāwalākhel"
          resolvedCity = location.name?.split(',')[0]?.trim() || '';
        } else {
          try {
            ({ lat, lon } = await getCoords());
            setLocationDenied(false);
            resolvedCity = await reverseGeocode(lat, lon);
          } catch {
            // Browser geolocation denied → try IP-based approximate location
            const ip = await getCoordsFromIP();
            if (ip) {
              lat = ip.lat;
              lon = ip.lon;
              resolvedCity = ip.city || '';
              setLocationDenied(false);
            } else {
              setLocationDenied(true);
              return;
            }
          }
        }

        const data = await fetchOpenMeteo(lat, lon, unit);
        const current = parseWeather(data, resolvedCity);
        console.log('[Weather] Open-Meteo current →', current);
        setWeather(current);

        const fc = parseForecast(data);
        console.log('[Weather] parsed forecast →', fc);
        setForecast(fc);
      } catch (e) {
        setError(e.message);
      }
    };

    load();
    const timerId = setInterval(load, 30 * 60_000);
    return () => clearInterval(timerId);
  }, [location, unit]);

  const settingsContent = (
    <Settings
      location={location}
      onChange={updateSetting}
      locationDenied={locationDenied}
      unit={unit}
      style={style}
    />
  );

  const unitLabel = unit === 'imperial' ? 'F' : 'C';

  const quip = getWeatherQuip(forecast, weather);
  const conditionGroup = weather ? getConditionGroup(weather.code) : null;

  // City displayed as first comma-segment (safe when weather exists)
  const cityShort = weather?.city?.split(',')?.[0]?.trim() || '';
  // Show feels-like whenever the displayed values actually differ
  const showFeels = weather && weather.feelsLike !== weather.temperature;

  return (
    <BaseWidget
      className={`p-4 flex flex-col${style !== 'expressive' ? ' items-center justify-center' : ''}`}
      settingsContent={settingsContent}
      onRemove={onRemove}
    >
      {/* ── Location denied ── */}
      {locationDenied && !location ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-5)', opacity: 0.4 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Location needed</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
            Open{' '}
            <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span>
            {' '}to search for your city.
          </p>
        </div>

        /* ── Error ── */
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-5)', opacity: 0.4 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Couldn&apos;t load weather</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
            Open <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to check your location.
          </p>
        </div>

        /* ── Skeleton (first load or location changed) ── */
      ) : !weather ? (
        style === 'expressive' ? <ExpressiveSkeleton /> : <SimpleSkeleton />

        /* ── Expressive: editorial paragraph layout ── */
      ) : style === 'expressive' ? (
        <div className="flex flex-col w-full h-full min-w-0 relative" style={{ letterSpacing: '-0.01em' }}>

          {/* ── Atmospheric visual ── */}
          <WeatherAtmosphere conditionGroup={conditionGroup} isDay={weather.isDay} />

          {/* ── TOP-LEFT: temperature block ── */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '0.18em', fontSize: '1.42rem', lineHeight: 1.08 }}>
            <div>
              <span style={{ fontWeight: 800, color: 'var(--w-accent)' }}>
                {weather.temperature}°{unitLabel}
              </span>
              <span style={{ fontWeight: 400, color: 'var(--w-ink-4)', marginLeft: '0.4em' }}>
                now
              </span>
            </div>
            {cityShort ? (
              <div>
                <span style={{ fontWeight: 400, color: 'var(--w-ink-4)' }}>in </span>
                <span data-testid="weather-city" style={{ fontWeight: 800, color: 'var(--w-ink-1)' }}>
                  {cityShort}
                </span>
              </div>
            ) : null}
            {showFeels && (
              <div>
                <span style={{ fontWeight: 400, color: 'var(--w-ink-4)' }}>feels like </span>
                <span style={{ fontWeight: 800, color: 'var(--w-accent)' }}>
                  {weather.feelsLike}°{unitLabel}
                </span>
              </div>
            )}
          </div>

          <div style={{ flex: 1 }} />

          {/* ── BOTTOM-RIGHT: condition + quip ── */}
          <div className="flex flex-col items-end" style={{ position: 'relative', zIndex: 1, gap: '0.06em', letterSpacing: 0, paddingBottom: '2px' }}>
            {forecast && (
              <div data-testid="weather-condition-row" style={{ display: 'flex', alignItems: 'baseline', gap: '0.2em' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--w-accent)', textTransform: 'capitalize' }}>
                  {forecast.type === 'clearing' ? 'clearing up' : forecast.description}
                </span>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--w-ink-4)' }}>
                  {forecast.type === 'clearing'
                    ? `in ${forecast.hours} ${forecast.hours === 1 ? 'hour' : 'hours'}`
                    : forecast.type === 'incoming'
                      ? `in ${forecast.hours} ${forecast.hours === 1 ? 'hour' : 'hours'}`
                      : `for next ${forecast.hours} ${forecast.hours === 1 ? 'hour' : 'hours'}`}
                </span>
              </div>
            )}
            {quip && (
              <div
                data-testid="weather-quip"
                className="text-right"
                style={{ fontSize: '0.70rem', fontWeight: 600, color: 'var(--w-ink-5)', lineHeight: 1.3, marginTop: '0.12em' }}
              >
                {quip}
              </div>
            )}
          </div>

        </div>

        /* ── Simple: centered icon layout ── */
      ) : (
        <div className="flex flex-col items-center w-full h-full">
          <div className="flex items-baseline gap-1.5">
            <span className="w-title-soft truncate">{cityShort}</span>
            <span className="w-title-bold">{weather.temperature}°{unitLabel}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center mt-4 mb-2">
            {getWeatherIcon(weather.code, weather.isDay)}
            <div className="w-caption font-bold mt-3 capitalize" style={{ color: 'var(--w-accent)' }}>
              {weather.description}
            </div>
          </div>
        </div>
      )}
    </BaseWidget>
  );
};
