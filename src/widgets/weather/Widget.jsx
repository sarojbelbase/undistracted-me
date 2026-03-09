import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../BaseWidget';
import { useWidgetSettings } from '../useWidgetSettings';
import { Settings } from './Settings';
import {
  Sun, MoonStars,
  CloudSun, CloudMoon,
  Cloud, Clouds,
  CloudRain, CloudRainHeavy,
  CloudDrizzle, CloudSleet,
  CloudSnow, CloudLightningRain,
  CloudFog, CloudHaze, CloudHaze2,
  Wind, Tornado,
  ArrowRepeat, ExclamationTriangle, KeyFill,
} from 'react-bootstrap-icons';

// OpenWeatherMap condition code → Bootstrap Icon component
// Codes: https://openweathermap.org/weather-conditions
const getWeatherIcon = (code, isDay, size = 52) => {
  const props = { size, className: 'text-gray-600' };
  if (code >= 200 && code < 300) return <CloudLightningRain {...props} />;
  if (code >= 300 && code < 400) return <CloudDrizzle {...props} />;
  if (code === 500) return <CloudRain {...props} />;
  if (code === 511) return <CloudSleet {...props} />;
  if (code >= 501 && code < 600) return <CloudRainHeavy {...props} />;
  if ([611, 612, 613, 615, 616].includes(code)) return <CloudSleet {...props} />;
  if (code >= 600 && code < 700) return <CloudSnow {...props} />;
  if (code === 741) return <CloudFog {...props} />;
  if (code === 701 || code === 721) return <CloudHaze {...props} />;
  if (code === 771) return <Wind {...props} />;
  if (code === 781) return <Tornado {...props} />;
  if (code >= 700 && code < 800) return <CloudHaze2 {...props} />;
  if (code === 800) return isDay ? <Sun {...props} /> : <MoonStars {...props} />;
  if (code === 801 || code === 802) return isDay ? <CloudSun {...props} /> : <CloudMoon {...props} />;
  if (code >= 803) return <Clouds {...props} />;
  return <Cloud {...props} />;
};

const API_KEY = import.meta.env.VITE_OWM_API_KEY || null;

const getCoords = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lon } }) => resolve({ lat, lon }),
      reject,
      { timeout: 8_000 }
    )
  );

const fetchWeatherByCoords = (lat, lon) =>
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`)
    .then(r => r.ok ? r.json() : Promise.reject(new Error(`API error ${r.status}`)));

const fetchWeatherByCity = (lat, lon) => fetchWeatherByCoords(lat, lon);

const parseWeather = (data) => ({
  condition: data.weather[0].main,
  description: data.weather[0].description,
  temperature: Math.round(data.main.temp),
  code: data.weather[0].id,
  isDay: data.dt >= data.sys.sunrise && data.dt < data.sys.sunset,
  city: data.name,
});

export const Widget = ({ id: widgetId }) => {
  const [settings, updateSetting] = useWidgetSettings(widgetId || 'weather', { location: null });
  const { location } = settings; // { name, lat, lon } or null
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
        const data = await fetchWeatherByCoords(lat, lon);
        setWeather(parseWeather(data));
      } catch (e) {
        setError(e.message);
      }
    };

    load();
    const id = setInterval(load, 30 * 60_000);
    return () => clearInterval(id);
  }, [location]);

  const settingsContent = API_KEY
    ? <Settings location={location} onChange={updateSetting} locationDenied={locationDenied} />
    : null;

  return (
    <BaseWidget className="p-4 flex flex-col items-center justify-center" settingsContent={settingsContent}>
      {!API_KEY ? (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <KeyFill size={36} />
          <span className="text-xs text-gray-400 text-center">API KEY not provided</span>
        </div>
      ) : locationDenied && !location ? (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <ExclamationTriangle size={36} />
          <span className="text-xs text-gray-400 text-center">Location denied, set in settings!</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <ExclamationTriangle size={36} />
          <span className="text-xs text-gray-400 text-center">{error}</span>
        </div>
      ) : weather ? (
        <div className="flex flex-col items-center w-full">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-semibold text-gray-400">{weather.city}</span>
            <span className="text-base font-bold text-gray-700">{weather.temperature}°C</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center mt-4 mb-2">
            {getWeatherIcon(weather.code, weather.isDay)}
            <div className="mt-3 text-xs font-bold text-gray-400 capitalize">{weather.description}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-gray-300">
          <ArrowRepeat size={36} className="animate-spin" />
          <span className="text-xs text-gray-400">Fetching weather...</span>
        </div>
      )}
    </BaseWidget>
  );
};
