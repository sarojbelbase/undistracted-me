import React, { useState, useEffect } from 'react';
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
  readWeatherCache,
  writeWeatherCache,
} from './utils.jsx';
import { getWeatherQuip } from '../../data/weatherQuips';
import { WeatherAtmosphere, getAtmosphereLabel } from '../../components/ui/WeatherAtmosphere.jsx';
import { Popup } from '../../components/ui/Popup.jsx';

// ── Skeleton blocks ───────────────────────────────────────────────────────────

const Bone = ({ width, height, className = '' }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ width, height, backgroundColor: 'var(--panel-bg)', flexShrink: 0 }}
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
            backgroundColor: isActive ? 'var(--w-ink-3)' : 'var(--panel-bg)',
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
  const [atmoAnchor, setAtmoAnchor] = useState(null);

  useEffect(() => {
    setError(null);

    // ── Instant pre-population from cache ──────────────────────────────────
    // Eliminates the skeleton on every subsequent new-tab open.
    // The background fetch below still runs if data is stale (> 30 min).
    const cacheKey = location ? `${location.lat},${location.lon}` : 'auto';
    const cached = readWeatherCache(cacheKey, unit);
    if (cached?.weather) {
      setWeather(cached.weather);
      setForecast(cached.forecast);
    } else {
      setWeather(null);
      setForecast(null);
    }

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
        setWeather(current);

        const fc = parseForecast(data);
        setForecast(fc);

        // Persist fresh result so next tab open is instant
        writeWeatherCache(current, fc, cacheKey, unit);
      } catch (e) {
        setError(e.message);
      }
    };

    // Skip network if cache is fresh (< 30 min old); still schedule the interval
    if (!cached?.fresh) load();
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

  const quip = getWeatherQuip(forecast, weather, { windGust: weather?.windGust ?? 0 });

  // City displayed as first comma-segment (safe when weather exists)
  const cityShort = weather?.city?.split(',')?.[0]?.trim() || '';

  return (
    <BaseWidget
      className={`p-4 flex flex-col${style !== 'expressive' ? ' items-center justify-center' : ''}`}
      settingsContent={settingsContent}
      onRemove={onRemove}
    >
      {/* ── Location denied ── */}
      {locationDenied && !location ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-4)', opacity: 0.65 }} />
          <p className="w-muted font-semibold">Location needed</p>
          <p className="w-caption leading-relaxed">
            Open{' '}
            <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span>
            {' '}to search for your city.
          </p>
        </div>

        /* ── Error ── */
      ) : error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-4)', opacity: 0.65 }} />
          <p className="w-muted font-semibold">Couldn&apos;t load weather</p>
          <p className="w-caption leading-relaxed">
            Open <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to check your location.
          </p>
        </div>

        /* ── Skeleton (first load or location changed) ── */
      ) : !weather ? (
        style === 'expressive' ? <ExpressiveSkeleton /> : <SimpleSkeleton />

        /* ── Expressive: editorial paragraph layout ── */
      ) : style === 'expressive' ? (
        <div className="flex flex-col w-full h-full min-w-0 relative" style={{ letterSpacing: '-0.01em' }}>

          {/* ── Atmospheric visual + hover tooltip ── */}
          <WeatherAtmosphere weatherCode={weather.code} isDay={weather.isDay} windGust={weather.windGust ?? 0} />
          <div
            style={{ position: 'absolute', top: 0, right: 0, width: 64, height: 64, zIndex: 2, cursor: 'default' }}
            onMouseEnter={e => setAtmoAnchor(e.currentTarget.getBoundingClientRect())}
            onMouseLeave={() => setAtmoAnchor(null)}
          />
          {atmoAnchor && (
            <Popup anchor={atmoAnchor} preferAbove={false} className="px-2.5 py-1.5">
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--w-ink-3)', whiteSpace: 'nowrap' }}>
                {getAtmosphereLabel(weather.code, weather.isDay)}
              </span>
            </Popup>
          )}

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
            {/* Second line: city takes priority; falls back to feels-like when no location is available */}
            {cityShort ? (
              <div>
                <span style={{ fontWeight: 400, color: 'var(--w-ink-4)' }}>in </span>
                <span data-testid="weather-city" style={{ fontWeight: 800, color: 'var(--w-ink-1)' }}>
                  {cityShort}
                </span>
              </div>
            ) : weather?.feelsLike !== undefined ? (
              <div>
                <span style={{ fontWeight: 400, color: 'var(--w-ink-4)', fontSize: '1.1rem' }}>feels like </span>
                <span style={{ fontWeight: 700, color: 'var(--w-accent)', fontSize: '1.1rem' }}>
                  {weather.feelsLike}°{unitLabel}
                </span>
              </div>
            ) : null}
          </div>

          <div style={{ flex: 1 }} />

          {/* ── BOTTOM-RIGHT: condition + quip ── */}
          <div className="flex flex-col items-end" style={{ position: 'relative', zIndex: 1, letterSpacing: 0, paddingBottom: '2px' }}>
            {/* Condition + duration: tight group — same information unit */}
            {forecast && (
              <div data-testid="weather-condition-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--w-accent)', textTransform: 'capitalize', lineHeight: 1.2 }}>
                  {forecast.type === 'clearing' ? 'clearing up' : forecast.description}
                </span>
                <span style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--w-ink-5)', lineHeight: 1.5 }}>
                  {forecast.type === 'clearing'
                    ? `in ${forecast.hours} ${forecast.hours === 1 ? 'hour' : 'hours'}`
                    : forecast.type === 'incoming'
                      ? `in ${forecast.hours} ${forecast.hours === 1 ? 'hour' : 'hours'}`
                      : `for next ${forecast.hours} ${forecast.hours === 1 ? 'hour' : 'hours'}`}
                </span>
              </div>
            )}
            {/* Quip: clearly separated — tertiary / decorative */}
            {quip && (
              <div
                data-testid="weather-quip"
                style={{
                  fontSize: '0.70rem',
                  fontWeight: 600,
                  color: 'var(--w-ink-4)',
                  lineHeight: 1.3,
                  textAlign: 'right',
                  marginTop: '0.18em',
                }}
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
