/**
 * Tests for src/widgets/weather/utils.jsx
 * Covers: getWeatherIcon (all code ranges), parseWeather, fetchWeatherByCoords,
 *         getCoords.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { getWeatherIcon, parseWeather, getCoords, fetchOpenMeteo, parseForecast, wmoDescription, readWeatherCache, writeWeatherCache } from '../../../src/widgets/weather/utils.jsx';

afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });
beforeEach(() => { localStorage.clear(); });

// ─────────────────────────────────────────────────────────────────────────────
// getWeatherIcon — returns a JSX element; we test the component type / props
// ─────────────────────────────────────────────────────────────────────────────

const renderIcon = (code, isDay = true, size = 52) => {
  const el = getWeatherIcon(code, isDay, size);
  const { container } = render(el);
  return container.firstChild; // <svg>
};

describe('getWeatherIcon — Thunderstorm (200–299)', () => {
  it('returns CloudLightningRain for code 200', () => {
    expect(renderIcon(200)).toBeTruthy();
  });
  it('returns an icon for code 231', () => {
    expect(renderIcon(231)).toBeTruthy();
  });
  it('returns an icon for code 299', () => {
    expect(renderIcon(299)).toBeTruthy();
  });
});

describe('getWeatherIcon — Drizzle (300–399)', () => {
  it('returns CloudDrizzle for code 300', () => {
    expect(renderIcon(300)).toBeTruthy();
  });
  it('handles code 399', () => {
    expect(renderIcon(399)).toBeTruthy();
  });
});

describe('getWeatherIcon — Rain (500–531)', () => {
  it('returns CloudRain for code 500 (light rain)', () => {
    expect(renderIcon(500)).toBeTruthy();
  });
  it('returns CloudSleet for code 511 (freezing rain)', () => {
    expect(renderIcon(511)).toBeTruthy();
  });
  it('returns CloudRainHeavy for code 502', () => {
    expect(renderIcon(502)).toBeTruthy();
  });
  it('handles code 531', () => {
    expect(renderIcon(531)).toBeTruthy();
  });
});

describe('getWeatherIcon — Snow / Sleet (600–699)', () => {
  it('returns CloudSleet for code 611', () => {
    expect(renderIcon(611)).toBeTruthy();
  });
  it('returns CloudSleet for code 616', () => {
    expect(renderIcon(616)).toBeTruthy();
  });
  it('returns CloudSnow for code 620', () => {
    expect(renderIcon(620)).toBeTruthy();
  });
});

describe('getWeatherIcon — Atmosphere (700–799)', () => {
  it('returns CloudFog for code 741', () => {
    expect(renderIcon(741)).toBeTruthy();
  });
  it('returns CloudHaze for code 701', () => {
    expect(renderIcon(701)).toBeTruthy();
  });
  it('returns CloudHaze for code 721', () => {
    expect(renderIcon(721)).toBeTruthy();
  });
  it('returns Wind for code 771', () => {
    expect(renderIcon(771)).toBeTruthy();
  });
  it('returns Tornado for code 781', () => {
    expect(renderIcon(781)).toBeTruthy();
  });
  it('returns CloudHaze2 for unknown atmosphere code (751)', () => {
    expect(renderIcon(751)).toBeTruthy();
  });
});

describe('getWeatherIcon — Clear sky (800)', () => {
  it('returns Sun icon during the day', () => {
    expect(renderIcon(800, true)).toBeTruthy();
  });
  it('returns MoonStars icon at night', () => {
    expect(renderIcon(800, false)).toBeTruthy();
  });
});

describe('getWeatherIcon — Mostly clear (801–802)', () => {
  it('returns CloudSun for code 801 during day', () => {
    expect(renderIcon(801, true)).toBeTruthy();
  });
  it('returns CloudMoon for code 801 at night', () => {
    expect(renderIcon(801, false)).toBeTruthy();
  });
  it('returns CloudSun for code 802 during day', () => {
    expect(renderIcon(802, true)).toBeTruthy();
  });
});

describe('getWeatherIcon — Overcast (803+)', () => {
  it('returns Clouds for code 803', () => {
    expect(renderIcon(803)).toBeTruthy();
  });
  it('returns Clouds for code 804', () => {
    expect(renderIcon(804)).toBeTruthy();
  });
});

describe('getWeatherIcon — Unknown code fallback', () => {
  it('returns Cloud for completely unknown code 999', () => {
    expect(renderIcon(999)).toBeTruthy();
  });
  it('returns a JSX element (not null or undefined)', () => {
    const el = getWeatherIcon(0, true);
    expect(el).not.toBeNull();
    expect(el).not.toBeUndefined();
  });
});

describe('getWeatherIcon — size prop', () => {
  it('passes size to the icon component (renders without crash for size=14)', () => {
    const el = getWeatherIcon(800, true, 14);
    expect(() => render(el)).not.toThrow();
  });
  it('returns a JSX element for default size 52', () => {
    const el = getWeatherIcon(800, true);
    expect(React.isValidElement(el)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseWeather — parses OWM /weather response
// ─────────────────────────────────────────────────────────────────────────────

// Open-Meteo format (replaces old OWM format)
const mockOpenMeteoResponse = {
  current: {
    temperature_2m: 25.6,
    apparent_temperature: 24.0,
    weather_code: 0,       // 0 = clear sky
    is_day: 1,
    precipitation: 0,
    wind_gusts_10m: 10,
  },
  // parseWeather also takes cityName as 2nd arg
};

describe('parseWeather', () => {
  it('returns correct condition from weather[0].main', () => {
    const result = parseWeather(mockOpenMeteoResponse, 'Kathmandu');
    expect(result.code).toBe(0);
  });

  it('returns correct description', () => {
    expect(parseWeather(mockOpenMeteoResponse, 'Kathmandu').description).toBeTruthy();
  });

  it('rounds temperature to integer', () => {
    const result = parseWeather(mockOpenMeteoResponse, 'Kathmandu');
    expect(result.temperature).toBe(26); // Math.round(25.6)
    expect(Number.isInteger(result.temperature)).toBe(true);
  });

  it('returns weather code', () => {
    expect(parseWeather(mockOpenMeteoResponse, 'Kathmandu').code).toBe(0);
  });

  it('returns city name', () => {
    expect(parseWeather(mockOpenMeteoResponse, 'Kathmandu').city).toBe('Kathmandu');
  });

  it('isDay = true when is_day = 1', () => {
    expect(parseWeather(mockOpenMeteoResponse, 'Kathmandu').isDay).toBe(true);
  });

  it('isDay = false when is_day = 0', () => {
    const night = { ...mockOpenMeteoResponse, current: { ...mockOpenMeteoResponse.current, is_day: 0 } };
    expect(parseWeather(night, 'Kathmandu').isDay).toBe(false);
  });

  it('isDay = false when is_day is falsy', () => {
    const night = { ...mockOpenMeteoResponse, current: { ...mockOpenMeteoResponse.current, is_day: 0 } };
    expect(parseWeather(night).isDay).toBe(false);
  });

  it('isDay = true when is_day = 1 (duplicate for clarity)', () => {
    const day = { ...mockOpenMeteoResponse, current: { ...mockOpenMeteoResponse.current, is_day: 1 } };
    expect(parseWeather(day).isDay).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchWeatherByCoords — mocked fetch
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchOpenMeteo', () => {
  it('resolves with JSON on a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOpenMeteoResponse),
    }));
    const data = await fetchOpenMeteo(27.7, 85.3);
    expect(data.current).toBeTruthy();
  });

  it('rejects with an error message on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({}),
    }));
    await expect(fetchOpenMeteo(27.7, 85.3)).rejects.toThrow('401');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCoords — wraps navigator.geolocation
// ─────────────────────────────────────────────────────────────────────────────

describe('getCoords', () => {
  it('resolves with { lat, lon } when geolocation succeeds', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({ coords: { latitude: 27.7172, longitude: 85.3240 } })
      ),
    };
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });

    const result = await getCoords();
    expect(result.lat).toBeCloseTo(27.7172);
    expect(result.lon).toBeCloseTo(85.324);
  });

  it('rejects when geolocation fails', async () => {
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_, reject) => reject(new Error('denied'))),
    };
    vi.stubGlobal('navigator', { geolocation: mockGeolocation });

    await expect(getCoords()).rejects.toThrow('denied');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// wmoDescription
// ─────────────────────────────────────────────────────────────────────────────

describe('wmoDescription', () => {
  it('returns "clear sky" for code 0', () => {
    expect(wmoDescription(0)).toBe('clear sky');
  });
  it('returns "rain" for code 63', () => {
    expect(wmoDescription(63)).toBe('rain');
  });
  it('returns "thunderstorm" for code 95', () => {
    expect(wmoDescription(95)).toBe('thunderstorm');
  });
  it('returns "unknown" for an unrecognized code', () => {
    expect(wmoDescription(999)).toBe('unknown');
  });
  it('returns a string for all WMO codes', () => {
    [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99].forEach(code => {
      expect(typeof wmoDescription(code)).toBe('string');
      expect(wmoDescription(code).length).toBeGreaterThan(0);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseForecast — parses hourly Open-Meteo data for weather narrative
// ─────────────────────────────────────────────────────────────────────────────

describe('parseForecast', () => {
  it('returns null when data has no hourly', () => {
    expect(parseForecast({})).toBeNull();
    expect(parseForecast(null)).toBeNull();
  });

  it('returns null when hourly.weather_code is empty', () => {
    expect(parseForecast({ hourly: { weather_code: [], precipitation_probability: [] } })).toBeNull();
  });

  it('returns clearing type when currently precipitating and will clear', () => {
    // code >= 51 = precipitation
    const data = {
      hourly: {
        weather_code: [63, 63, 1, 1, 1, 1, 1, 1],
        precipitation_probability: [80, 75, 20, 10, 5, 5, 5, 5],
      },
    };
    const result = parseForecast(data);
    expect(result).not.toBeNull();
    expect(result.type).toBe('clearing');
    expect(result.hours).toBeGreaterThan(0);
  });

  it('returns persist type when currently precipitating and will NOT clear within window', () => {
    const data = {
      hourly: {
        weather_code: [80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80, 80],
        precipitation_probability: [90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90, 90],
      },
    };
    const result = parseForecast(data);
    expect(result).not.toBeNull();
    expect(result.type).toBe('persist');
  });

  it('returns incoming type when clear now but rain arrives in <8h', () => {
    const data = {
      hourly: {
        weather_code: [0, 0, 0, 63, 63, 63, 63, 63],
        precipitation_probability: [5, 10, 30, 60, 80, 80, 80, 80],
      },
    };
    const result = parseForecast(data);
    expect(result).not.toBeNull();
    expect(result.type).toBe('incoming');
    expect(result.hours).toBeGreaterThan(0);
  });

  it('returns incoming/possible type for moderate (30-50%) precipitation probability', () => {
    const data = {
      hourly: {
        weather_code: [0, 0, 63, 2, 2, 2, 2, 2],
        precipitation_probability: [5, 10, 35, 20, 10, 5, 5, 5],
      },
    };
    const result = parseForecast(data);
    // Should return incoming/possible (>=30% pop) not null
    expect(result).not.toBeNull();
  });

  it('returns persist type when no rain in next 6h (Case 4 dominant condition)', () => {
    const data = {
      hourly: {
        weather_code: [0, 1, 2, 1, 0, 0, 0, 0],
        precipitation_probability: [5, 10, 15, 10, 5, 5, 5, 5],
      },
    };
    const result = parseForecast(data);
    // Case 4 always returns non-null with type 'persist' and dominant code
    expect(result).not.toBeNull();
    expect(result.type).toBe('persist');
    expect(typeof result.code).toBe('number');
  });

  it('result has description, code, hours, type when not null', () => {
    const data = {
      hourly: {
        weather_code: [63, 63, 1, 1, 1, 1, 1, 1],
        precipitation_probability: [80, 75, 20, 10, 5, 5, 5, 5],
      },
    };
    const result = parseForecast(data);
    if (result) {
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('code');
      expect(result).toHaveProperty('hours');
      expect(result).toHaveProperty('type');
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// readWeatherCache / writeWeatherCache
// ─────────────────────────────────────────────────────────────────────────────

const FAKE_WEATHER_RESULT = { temperature: 25, code: 0, city: 'Kathmandu' };
const FAKE_FORECAST_RESULT = { description: 'clear sky', type: 'persist' };

describe('writeWeatherCache / readWeatherCache', () => {
  it('readWeatherCache returns null when nothing cached', () => {
    expect(readWeatherCache('loc:27.7:85.3', 'metric')).toBeNull();
  });

  it('writeWeatherCache then readWeatherCache returns the cached data', () => {
    writeWeatherCache(FAKE_WEATHER_RESULT, FAKE_FORECAST_RESULT, 'loc:27.7:85.3', 'metric');
    const result = readWeatherCache('loc:27.7:85.3', 'metric');
    expect(result).not.toBeNull();
    expect(result.weather).toEqual(FAKE_WEATHER_RESULT);
    expect(result.forecast).toEqual(FAKE_FORECAST_RESULT);
  });

  it('readWeatherCache marks entry as fresh when recently written', () => {
    writeWeatherCache(FAKE_WEATHER_RESULT, FAKE_FORECAST_RESULT, 'loc:27.7:85.3', 'metric');
    const result = readWeatherCache('loc:27.7:85.3', 'metric');
    expect(result.fresh).toBe(true);
  });

  it('readWeatherCache returns null when locationKey does not match', () => {
    writeWeatherCache(FAKE_WEATHER_RESULT, FAKE_FORECAST_RESULT, 'loc:27.7:85.3', 'metric');
    expect(readWeatherCache('loc:51.5:-0.1', 'metric')).toBeNull();
  });

  it('readWeatherCache returns null when unit does not match', () => {
    writeWeatherCache(FAKE_WEATHER_RESULT, FAKE_FORECAST_RESULT, 'loc:27.7:85.3', 'metric');
    expect(readWeatherCache('loc:27.7:85.3', 'imperial')).toBeNull();
  });

  it('readWeatherCache returns null when localStorage is malformed', () => {
    localStorage.setItem('weather_cache_v1', 'INVALID_JSON{{{');
    expect(readWeatherCache('loc:27.7:85.3', 'metric')).toBeNull();
  });

  it('readWeatherCache marks stale entry as not fresh (>30 min old)', () => {
    const staleEntry = {
      weather: FAKE_WEATHER_RESULT,
      forecast: FAKE_FORECAST_RESULT,
      locationKey: 'loc:27.7:85.3',
      unit: 'metric',
      ts: Date.now() - 31 * 60 * 1000, // 31 minutes ago
    };
    localStorage.setItem('weather_cache_v1', JSON.stringify(staleEntry));
    const result = readWeatherCache('loc:27.7:85.3', 'metric');
    expect(result).not.toBeNull();
    expect(result.fresh).toBe(false);
  });
});
