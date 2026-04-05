import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { ArrowRepeat, GeoAlt } from 'react-bootstrap-icons';
import { API_KEY, getWeatherIcon, getCoords, fetchWeatherByCoords, parseWeather } from './utils.jsx';

export const Widget = ({ id = 'weather', onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { location: null, unit: 'metric' });
  const { location, unit } = settings; // location: { name, lat, lon } | null; unit: 'metric' | 'imperial'
  const [weather, setWeather] = useState(null);
  const [error, setError] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    if (!API_KEY) return;
    setError(null);

    const load = async () => {
      try {
        let lat, lon;
        if (location) {
          ({ lat, lon } = location);
        } else {
          try {
            ({ lat, lon } = await getCoords());
            setLocationDenied(false);
          } catch {
            setLocationDenied(true);
            return;
          }
        }
        const data = await fetchWeatherByCoords(lat, lon, unit);
        setWeather(parseWeather(data));
      } catch (e) {
        setError(e.message);
      }
    };

    load();
    const id = setInterval(load, 30 * 60_000);
    return () => clearInterval(id);
  }, [location, unit]);

  const settingsContent = API_KEY
    ? <Settings location={location} onChange={updateSetting} locationDenied={locationDenied} unit={unit} />
    : null;

  return (
    <BaseWidget className="p-4 flex flex-col items-center justify-center" settingsContent={settingsContent} onRemove={onRemove}>
      {!API_KEY ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-5)', opacity: 0.4 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Weather API key needed</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
            Set <code className="font-mono text-[11px]">API_KEY</code> in{' '}
            <code className="font-mono text-[11px]">weather/utils.jsx</code>
          </p>
        </div>
      ) : locationDenied && !location ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-5)', opacity: 0.4 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Location needed</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
            Open the{' '}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md align-middle" style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
              <svg width="10" height="3" viewBox="0 0 14 4" fill="currentColor" style={{ color: 'var(--w-ink-3)' }}><circle cx="2" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12" cy="2" r="1.5" /></svg>
            </span>
            {' '}menu and tap <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to set your location.
          </p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <GeoAlt size={22} style={{ color: 'var(--w-ink-5)', opacity: 0.4 }} />
          <p className="text-xs font-semibold" style={{ color: 'var(--w-ink-3)' }}>Couldn&apos;t load weather</p>
          <p className="text-[11px] leading-relaxed" style={{ color: 'var(--w-ink-5)' }}>
            Open the{' '}
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md align-middle" style={{ backgroundColor: 'var(--w-surface-2)', border: '1px solid var(--w-border)' }}>
              <svg width="10" height="3" viewBox="0 0 14 4" fill="currentColor" style={{ color: 'var(--w-ink-3)' }}><circle cx="2" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12" cy="2" r="1.5" /></svg>
            </span>
            {' '}menu and tap <span className="font-semibold" style={{ color: 'var(--w-ink-3)' }}>Settings</span> to check your location.
          </p>
        </div>
      ) : weather ? (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-baseline gap-1.5">
            <span className="w-title-soft">{weather.city}</span>
            <span className="w-title-bold">{weather.temperature}°{unit === 'imperial' ? 'F' : 'C'}</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center mt-4 mb-2">
            {getWeatherIcon(weather.code, weather.isDay)}
            <div className="w-caption font-bold mt-3 capitalize" style={{ color: 'var(--w-accent)' }}>{weather.description}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <ArrowRepeat size={36} className="animate-spin" />
          <span className="w-muted">Fetching weather...</span>
        </div>
      )}
    </BaseWidget>
  );
};
