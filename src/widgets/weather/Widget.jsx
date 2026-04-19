import React, { useState, useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { BaseWidget } from '../BaseWidget';
import config from './config';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { GeoAlt } from 'react-bootstrap-icons';
import {
  getWeatherIcon,
  fetchOpenMeteo,
  parseWeather,
  parseForecast,
  readWeatherCache,
  writeWeatherCache,
} from './utils.jsx';
import { useLocationStore } from '../../store/useLocationStore';
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
const PrecipBarItem = ({ pop, i, isActive }) => {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const show = () => setAnchor(ref.current?.getBoundingClientRect() ?? null);
  const hide = () => setAnchor(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`+${i}h: ${pop}%`}
        style={{
          width: '5px',
          height: `${Math.max(2, Math.round((pop / 100) * 16))}px`,
          borderRadius: '1.5px',
          backgroundColor: isActive ? 'var(--w-ink-3)' : 'var(--panel-bg)',
          opacity: isActive ? Math.max(0.2, pop / 100) : 1,
          cursor: 'default',
          border: 'none',
          padding: 0,
          outline: 'none',
          display: 'block',
          flexShrink: 0,
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      />
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--w-ink-2)', whiteSpace: 'nowrap' }}>
            {`+${i}h: ${pop}%`}
          </span>
        </Popup>
      )}
    </>
  );
};

const PrecipBars = ({ popSlots, eventHour }) => (
  <div
    className="flex items-end gap-px mt-2"
    style={{ height: '18px' }}
    aria-label="Hourly precipitation probability"
  >
    {popSlots.map((pop, i) => (
      <PrecipBarItem key={`${i}-${pop}`} pop={pop} i={i} isActive={i < eventHour} />
    ))}
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

// ── Forecast duration label ────────────────────────────────────────────────────
function getForecastLabel(forecast) {
  const h = forecast.hours;
  const hourUnit = h === 1 ? 'hour' : 'hours';
  if (forecast.type === 'clearing' || forecast.type === 'incoming') return `in ${h} ${hourUnit}`;
  return `for next ${h} ${hourUnit}`;
}

// ── Widget state views ─────────────────────────────────────────────────────────
const LocationDeniedState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
    <GeoAlt size={22} style={{ color: 'var(--w-ink-4)', opacity: 0.65 }} />
    <p className="w-muted font-semibold">Location needed</p>
    <p className="w-caption leading-relaxed">
      Open{' '}
      <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span>
      {' '}to search for your city.
    </p>
  </div>
);

const ErrorState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
    <GeoAlt size={22} style={{ color: 'var(--w-ink-4)', opacity: 0.65 }} />
    <p className="w-muted font-semibold">Couldn&apos;t load weather</p>
    <p className="w-caption leading-relaxed">
      Open <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to check your location.
    </p>
  </div>
);

const SimpleView = ({ weather, cityShort, unitLabel }) => (
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
);

const ExpressiveView = ({ weather, forecast, unitLabel, quip, cityShort, atmoAnchor, setAtmoAnchor }) => (
  <div className="flex flex-col w-full h-full min-w-0 relative" style={{ letterSpacing: '-0.01em' }}>
    <WeatherAtmosphere weatherCode={weather.code} isDay={weather.isDay} windGust={weather.windGust ?? 0} />
    <div
      role="none"
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
      ) : weather.feelsLike != null && (
        <div>
          <span style={{ fontWeight: 400, color: 'var(--w-ink-4)', fontSize: '1.1rem' }}>feels like </span>
          <span style={{ fontWeight: 700, color: 'var(--w-accent)', fontSize: '1.1rem' }}>
            {weather.feelsLike}°{unitLabel}
          </span>
        </div>
      )}
    </div>

    <div style={{ flex: 1 }} />

    {/* ── BOTTOM-RIGHT: condition + quip ── */}
    <div className="flex flex-col items-end" style={{ position: 'relative', zIndex: 1, letterSpacing: 0, paddingBottom: '2px' }}>
      {forecast && (
        <div data-testid="weather-condition-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--w-accent)', textTransform: 'capitalize', lineHeight: 1.2 }}>
            {forecast.type === 'clearing' ? 'clearing up' : forecast.description}
          </span>
          <span style={{ fontSize: '0.55rem', fontWeight: 600, color: 'var(--w-ink-5)', lineHeight: 1.5 }}>
            {getForecastLabel(forecast)}
          </span>
        </div>
      )}
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
);

function getWeatherContent({ locationDenied, location, error, weather, style, unitLabel, quip, cityShort, atmoAnchor, setAtmoAnchor, forecast }) {
  if (locationDenied && !location) return <LocationDeniedState />;
  if (error) return <ErrorState />;
  if (style === 'expressive') {
    if (!weather) return <ExpressiveSkeleton />;
    return <ExpressiveView weather={weather} forecast={forecast} unitLabel={unitLabel} quip={quip} cityShort={cityShort} atmoAnchor={atmoAnchor} setAtmoAnchor={setAtmoAnchor} />;
  }
  if (!weather) return <SimpleSkeleton />;
  return <SimpleView weather={weather} cityShort={cityShort} unitLabel={unitLabel} />;
}

// ── Widget ────────────────────────────────────────────────────────────────────

export const Widget = ({ id = 'weather', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { location: null, unit: 'metric', style: 'simple' });
  const { location, unit, style } = settings;
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [error, setError] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [atmoAnchor, setAtmoAnchor] = useState(null);

  // Read auto-location from the centralized location store.
  // When the store updates (e.g. VPN switch), geoLat/geoLon change and
  // the effect below re-runs, fetching fresh weather for the new position.
  const { geoLat, geoLon, geoCity, geoSource } = useLocationStore(
    useShallow(s => ({
      geoLat: s.lat,
      geoLon: s.lon,
      geoCity: s.city,
      geoSource: s.source,
    })),
  );

  useEffect(() => {
    setError(null);

    // ── Instant pre-population from cache ──────────────────────────────────
    // Eliminates the skeleton on every subsequent new-tab open.
    // The background fetch below still runs if data is stale (> 30 min).
    // Auto-location key includes actual coords so the cache naturally misses
    // when the user switches VPNs or upgrades from the Kathmandu fallback.
    let cacheKey;
    if (location) {
      cacheKey = `${location.lat},${location.lon}`;
    } else if (geoLat === null || geoLat === undefined) {
      cacheKey = 'auto';
    } else {
      cacheKey = `geo:${geoLat},${geoLon}`;
    }
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
          // Use coordinates from the centralized location store.
          // source='default' means both GPS and IP geo failed — treat as denied.
          if (geoSource === 'default' || geoLat == null) {
            setLocationDenied(geoSource === 'default');
            return;
          }
          lat = geoLat;
          lon = geoLon;
          resolvedCity = geoCity || '';
          setLocationDenied(false);
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
  }, [location, unit, geoLat, geoLon, geoSource, geoCity]);

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
  const content = getWeatherContent({ locationDenied, location, error, weather, style, unitLabel, quip, cityShort, atmoAnchor, setAtmoAnchor, forecast });

  return (
    <BaseWidget
      className={`p-4 flex flex-col${style === 'expressive' ? '' : ' items-center justify-center'}`}
      settingsTitle={config.title}
      settingsContent={settingsContent}
      onRemove={onRemove}
    >
      {content}
    </BaseWidget>
  );
};
