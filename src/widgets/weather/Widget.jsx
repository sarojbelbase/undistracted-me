import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import { ArrowRepeat, ExclamationTriangle, KeyFill } from 'react-bootstrap-icons';
import { API_KEY, getWeatherIcon, getCoords, fetchWeatherByCoords, parseWeather } from './utils.jsx';

export const Widget = ({ id: widgetId, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId || 'weather', { location: null, unit: 'metric' });
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
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <KeyFill size={36} />
          <span className="w-muted">API KEY not provided</span>
        </div>
      ) : locationDenied && !location ? (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <ExclamationTriangle size={36} />
          <span className="w-muted">Location denied, set in settings!</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <ExclamationTriangle size={36} />
          <span className="w-muted">{error}</span>
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
