/**
 * Weather widget utilities
 */
import React from 'react';
import {
  Sun, MoonStars,
  CloudSun, CloudMoon,
  Cloud, Clouds,
  CloudRain, CloudRainHeavy,
  CloudDrizzle, CloudSleet,
  CloudSnow, CloudLightningRain,
  CloudFog, CloudHaze, CloudHaze2,
  Wind, Tornado,
} from 'react-bootstrap-icons';

export const API_KEY = import.meta.env.VITE_OWM_API_KEY || null;

/**
 * Returns the appropriate BSicon weather component for a given OWM condition code.
 * Codes: https://openweathermap.org/weather-conditions
 */
export const getWeatherIcon = (code, isDay, size = 52) => {
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

/**
 * Requests the user's geolocation. Returns { lat, lon }.
 */
export const getCoords = () =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude: lat, longitude: lon } }) => resolve({ lat, lon }),
      reject,
      { timeout: 8_000 },
    ),
  );

/**
 * Fetches current weather from OpenWeatherMap for the given coordinates.
 */
export const fetchWeatherByCoords = (lat, lon) =>
  fetch(
    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`,
  ).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`API error ${r.status}`))));

/**
 * Extracts a normalized weather object from an OWM /weather response.
 */
export const parseWeather = (data) => ({
  condition: data.weather[0].main,
  description: data.weather[0].description,
  temperature: Math.round(data.main.temp),
  code: data.weather[0].id,
  isDay: data.dt >= data.sys.sunrise && data.dt < data.sys.sunset,
  city: data.name,
});
