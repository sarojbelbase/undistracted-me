import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { GeoAlt } from 'react-bootstrap-icons';
import {
  getWeatherIcon,
  getCoords,
  getCoordsFromIP,
  fetchOpenMeteo,
  parseWeather,
  parseForecast,
} from './utils.jsx';

// ── Skeleton blocks ───────────────────────────────────────────────────────────

const Bone = ({ width, height, className = '' }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ width, height, backgroundColor: 'var(--w-surface-2)', flexShrink: 0 }}
  />
);

const ExpressiveSkeleton = () => (
  <div className="flex flex-col w-full h-full min-w-0" style={{ lineHeight: 1 }}>
    <Bone width="4.5rem" height="2.8rem" />
    <Bone width="5.5rem" height="0.85rem" className="mt-2" />
    <Bone width="7rem" height="0.7rem" className="mt-1.5" />
    <div className="flex-1" />
    <div style={{ height: '1px', backgroundColor: 'var(--w-surface-2)', margin: '0 0 6px' }} />
    <Bone width="5rem" height="0.75rem" />
    <Bone width="3.5rem" height="0.7rem" className="mt-1.5" />
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

  // City displayed as first comma-segment (safe when weather exists)
  const cityShort = weather?.city?.split(',')?.[0]?.trim() || '';
  // Only show feels-like when it differs from actual temp by ≥ 2°
  const showFeels = weather && Math.abs(weather.feelsLike - weather.temperature) >= 2;
  const feelsDir = weather?.feelsLike > weather?.temperature ? 'warmer' : 'cooler';
  // Natural prefix for the forecast sentence
  const forecastLabel = forecast?.type === 'clearing' ? 'clears in'
    : forecast?.type === 'incoming' ? 'arrives in'
      : 'for the next';

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

        /* ── Expressive: editorial typographic layout ── */
      ) : style === 'expressive' ? (
        <div className="flex flex-col w-full h-full min-w-0">

          {/* HERO — temperature fills the visual weight of the card */}
          <div style={{ lineHeight: 1 }}>
            <span
              style={{
                fontSize: '2.75rem',
                fontWeight: 800,
                letterSpacing: '-0.045em',
                color: 'var(--w-ink-1)',
              }}
            >
              {weather.temperature}°
            </span>
            <span
              style={{
                fontSize: '1.2rem',
                fontWeight: 500,
                letterSpacing: '-0.01em',
                color: 'var(--w-ink-3)',
              }}
            >
              {unitLabel}
            </span>
          </div>

          {/* City */}
          <div
            data-testid="weather-city"
            className="mt-1.5 truncate"
            style={{
              fontSize: '1rem',
              fontWeight: 600,
              letterSpacing: '-0.015em',
              color: 'var(--w-ink-2)',
              lineHeight: 1.2,
            }}
          >
            {cityShort || 'your location'}
          </div>

          {/* Condition  ·  feels-like (hidden when equal to temp within 1°) */}
          <div
            className="mt-1"
            style={{ fontSize: '0.75rem', color: 'var(--w-ink-5)', lineHeight: 1.4 }}
          >
            <span className="capitalize">{weather.description}</span>
            {showFeels && (
              <>
                <span style={{ opacity: 0.4 }}> · </span>
                <span>feels {feelsDir} at {weather.feelsLike}°{unitLabel}</span>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Forecast block */}
          {forecast && (
            <div>
              <div style={{ height: '1px', backgroundColor: 'var(--w-border)', marginBottom: '7px' }} />

              {/* Icon + condition description */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="shrink-0">
                  {getWeatherIcon(forecast.code, weather.isDay, 13)}
                </span>
                <span
                  data-testid="weather-condition-row"
                  className="truncate capitalize"
                  style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--w-ink-2)' }}
                >
                  {forecast.description}
                </span>
              </div>

              {/* Qualifying sentence: "clears in / arrives in / for the next  N hours" */}
              <div
                style={{ fontSize: '0.75rem', color: 'var(--w-ink-5)', marginTop: '2px', paddingLeft: '19px' }}
              >
                {forecastLabel}{' '}
                <span
                  data-testid="weather-forecast-hours"
                  style={{ fontWeight: 500, color: 'var(--w-ink-4)' }}
                >
                  {forecast.hours} {forecast.hours === 1 ? 'hour' : 'hours'}
                </span>
              </div>

              {/* Precipitation probability mini-bars (clearing/incoming only).
                  Each bar = one hour; the drop in bar height shows exactly which
                  hour triggered the "clears in N hours" or "arrives in N hours" call. */}
              {(forecast.type === 'clearing' || forecast.type === 'incoming')
                && forecast.popSlots?.length > 0 && (
                  <div style={{ paddingLeft: '19px' }}>
                    <PrecipBars popSlots={forecast.popSlots} eventHour={forecast.hours} />
                  </div>
                )}
            </div>
          )}

        </div>

        /* ── Simple: centered icon layout ── */
      ) : (
        <div className="flex flex-col items-center w-full h-full">
          <div className="flex items-baseline gap-1.5">
            <span className="w-title-soft truncate max-w-[8ch]">{cityShort}</span>
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
