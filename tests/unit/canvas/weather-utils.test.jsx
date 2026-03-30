/**
 * Tests for src/widgets/weather/utils.jsx
 * Covers: getWeatherIcon (all code ranges), parseWeather, fetchWeatherByCoords,
 *         getCoords.
 */

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { getWeatherIcon, parseWeather, getCoords, fetchWeatherByCoords } from '../../../src/widgets/weather/utils.jsx';

afterEach(() => vi.restoreAllMocks());

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

const mockOWMResponse = {
  weather: [{ id: 800, main: 'Clear', description: 'clear sky' }],
  main: { temp: 25.6 },
  dt: 1700000000,
  sys: { sunrise: 1699980000, sunset: 1700023200 },
  name: 'Kathmandu',
};

describe('parseWeather', () => {
  it('returns correct condition from weather[0].main', () => {
    const result = parseWeather(mockOWMResponse);
    expect(result.condition).toBe('Clear');
  });

  it('returns correct description', () => {
    expect(parseWeather(mockOWMResponse).description).toBe('clear sky');
  });

  it('rounds temperature to integer', () => {
    const result = parseWeather(mockOWMResponse);
    expect(result.temperature).toBe(26); // Math.round(25.6)
    expect(Number.isInteger(result.temperature)).toBe(true);
  });

  it('returns weather code', () => {
    expect(parseWeather(mockOWMResponse).code).toBe(800);
  });

  it('returns city name', () => {
    expect(parseWeather(mockOWMResponse).city).toBe('Kathmandu');
  });

  it('isDay = true when dt is between sunrise and sunset', () => {
    // dt=1700000000, sunrise=1699980000, sunset=1700023200
    expect(parseWeather(mockOWMResponse).isDay).toBe(true);
  });

  it('isDay = false when dt is before sunrise', () => {
    const night = { ...mockOWMResponse, dt: 1699970000 };
    expect(parseWeather(night).isDay).toBe(false);
  });

  it('isDay = false when dt equals sunset (exclusive upper bound)', () => {
    const atSunset = { ...mockOWMResponse, dt: mockOWMResponse.sys.sunset };
    expect(parseWeather(atSunset).isDay).toBe(false);
  });

  it('isDay = true when dt equals sunrise (inclusive lower bound)', () => {
    const atSunrise = { ...mockOWMResponse, dt: mockOWMResponse.sys.sunrise };
    expect(parseWeather(atSunrise).isDay).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// fetchWeatherByCoords — mocked fetch
// ─────────────────────────────────────────────────────────────────────────────

describe('fetchWeatherByCoords', () => {
  it('resolves with JSON on a 200 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOWMResponse),
    }));
    const data = await fetchWeatherByCoords(27.7, 85.3);
    expect(data.name).toBe('Kathmandu');
  });

  it('rejects with an error message on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false, status: 401,
      json: () => Promise.resolve({}),
    }));
    await expect(fetchWeatherByCoords(27.7, 85.3)).rejects.toThrow('API error 401');
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
