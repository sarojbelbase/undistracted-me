/**
 * Unit tests for FocusMode hooks: useFocusWeather, useFocusStocks,
 * useFocusPhoto, useFocusTimezones.
 *
 * External dependencies (weather/stock fetch, unsplash, Zustand store) are all
 * vi.mock()-ed so tests run in pure JS without network or extension APIs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ─── Module mocks (hoisted before imports by Vitest) ─────────────────────────

vi.mock('../../../app/widgets/weather/utils.jsx', () => ({
  API_KEY: 'test-key',
  fetchOpenMeteo: vi.fn(),
  parseWeather: vi.fn(),
}));

vi.mock('../../../app/widgets/stock/utils', () => ({
  fetchChart: vi.fn(),
  DEFAULT_SYMBOLS: [],
}));

vi.mock('../../../app/utilities/unsplash', () => ({
  getCachedPhotoSync: vi.fn(),
  getCurrentPhoto: vi.fn(),
  rotatePhoto: vi.fn(),
  jumpToPhotoById: vi.fn(),
  getPhotoLibrary: vi.fn(() => []),
  setCurrentPhotoId: vi.fn(),
}));

vi.mock('../../../app/store', () => ({
  useWidgetInstancesStore: vi.fn(),
}));

vi.mock('../../../app/store/useLocationStore', () => ({
  useLocationStore: vi.fn(),
}));

// useFocusWeather delegates to the shared useWeather hook.
vi.mock('../../../app/hooks/useWeather', () => ({
  useWeather: vi.fn(),
}));

// useFocusStocks re-exports useStocks, which depends on the shared DataHub.
vi.mock('../../../app/hooks/useDataHub', () => ({
  useDataHub: vi.fn(),
}));

// Prevent heavy spotify utils import chain from loading
vi.mock('../../../app/widgets/spotify/utils', () => ({
  getCurrentPlayback: vi.fn(),
  isSpotifyConnected: vi.fn(() => false),
  setPlayPause: vi.fn(),
  skipNext: vi.fn(),
  skipPrev: vi.fn(),
}));

// ─── Import mocked modules so we can configure their behaviour per-test ───────

import {
  fetchOpenMeteo,
  parseWeather,
} from '../../../app/widgets/weather/utils.jsx';

import { fetchChart } from '../../../app/widgets/stock/utils';

import {
  getCachedPhotoSync,
  getCurrentPhoto,
  rotatePhoto,
  jumpToPhotoById,
  getPhotoLibrary,
  setCurrentPhotoId,
} from '../../../app/utilities/unsplash';

import { useWidgetInstancesStore } from '../../../app/store';
import { useLocationStore } from '../../../app/store/useLocationStore';
import { useWeather } from '../../../app/hooks/useWeather';
import { useDataHub } from '../../../app/hooks/useDataHub';

// ─── Import hooks under test ──────────────────────────────────────────────────

import {
  useFocusWeather,
  useFocusStocks,
  useFocusPhoto,
  useFocusTimezones,
} from '../../../app/components/FocusMode/hooks.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FAKE_WEATHER = { temp: 22, description: 'Sunny', icon: '01d', unit: 'metric' };
const FAKE_PHOTO = { regular: 'https://example.com/photo.jpg', id: 'abc123' };
const FAKE_PHOTO_2 = { regular: 'https://example.com/photo2.jpg', id: 'def456' };

/**
 * Configure the useWidgetInstancesStore mock to work with selector calls.
 * The hooks call: useWidgetInstancesStore(s => { ... s.instances ... s.widgetSettings ... })
 * So we need mockImplementation to invoke the selector with a fake state object.
 */
function mockStore(instances = [], widgetSettings = {}) {
  useWidgetInstancesStore.mockImplementation((selector) =>
    selector({ instances, widgetSettings })
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// useFocusWeather
// ═════════════════════════════════════════════════════════════════════════════

// NOTE: no vi.useFakeTimers() in useFocusWeather/useFocusStocks — fake timers
// break waitFor()'s internal setTimeout polling. We test setInterval via spy.
describe('useFocusWeather', () => {
  const mockLocation = (lat, lon, source) => {
    useLocationStore.mockImplementation((selector) =>
      selector({ lat, lon, source })
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default store state: no instances, no settings → weatherSettings = null
    mockStore([], {});
    // Default: no geolocation yet, default source
    mockLocation(null, null, 'default');
    useWeather.mockReturnValue({ weather: null });
  });

  it('returns null when useWeather has no weather', () => {
    const { result } = renderHook(() => useFocusWeather());
    expect(result.current).toBeNull();
  });

  it('returns weather (with unit) when useWeather resolves weather', () => {
    useWeather.mockReturnValue({ weather: FAKE_WEATHER });
    const { result } = renderHook(() => useFocusWeather());
    expect(result.current).toEqual({ ...FAKE_WEATHER, unit: 'metric' });
  });

  it('passes location from Zustand widgetSettings (weather widget) to useWeather', () => {
    mockStore(
      [{ type: 'weather', id: 'weather' }],
      { weather: { location: { lat: 27.7, lon: 85.3 }, unit: 'imperial' } }
    );
    renderHook(() => useFocusWeather());
    expect(useWeather).toHaveBeenCalledWith({
      lat: 27.7, lon: 85.3, unit: 'imperial', cityName: '',
    });
  });

  it('passes instance-id-scoped widgetSettings location when instance id differs', () => {
    const instanceId = 'wid-uuid-001';
    mockStore(
      [{ type: 'weather', id: instanceId }],
      { [instanceId]: { location: { lat: 51.5, lon: -0.1 }, unit: 'metric' } }
    );
    renderHook(() => useFocusWeather());
    expect(useWeather).toHaveBeenCalledWith({
      lat: 51.5, lon: -0.1, unit: 'metric', cityName: '',
    });
  });

  it('falls back to location-store coords when no manual location and source is not default', () => {
    mockLocation(40.7128, -74.006, 'browser');
    renderHook(() => useFocusWeather());
    expect(useWeather).toHaveBeenCalledWith({
      lat: 40.7128, lon: -74.006, unit: 'metric', cityName: '',
    });
  });

  it('passes null coords when no manual location and default geo source', () => {
    renderHook(() => useFocusWeather());
    expect(useWeather).toHaveBeenCalledWith({
      lat: null, lon: null, unit: 'metric', cityName: '',
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// useFocusStocks
// ═════════════════════════════════════════════════════════════════════════════

describe('useFocusStocks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no stock instances in store → symbols = []
    mockStore([], {});
    useDataHub.mockReturnValue({ data: [], updatedAt: null, meta: {}, hydrated: true, write: vi.fn() });
    fetchChart.mockResolvedValue({ close: 150 });
  });

  it('returns [] when no stock symbols are configured', () => {
    const { result } = renderHook(() => useFocusStocks());
    expect(result.current.stocks).toEqual([]);
    expect(fetchChart).not.toHaveBeenCalled();
  });

  it('returns placeholder entries (data: null) for configured symbols', () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['AAPL', 'GOOGL'] } }
    );
    const { result } = renderHook(() => useFocusStocks());
    expect(result.current.stocks).toEqual([
      { sym: 'AAPL', data: null },
      { sym: 'GOOGL', data: null },
    ]);
  });

  it('fetches each configured symbol via fetchChart', async () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['AAPL', 'GOOGL'] } }
    );
    renderHook(() => useFocusStocks());
    await waitFor(() => expect(fetchChart).toHaveBeenCalledWith('AAPL'), { timeout: 3000 });
    expect(fetchChart).toHaveBeenCalledWith('GOOGL');
  });

  it('reads symbols from instance-id-scoped widgetSettings when instance id differs', () => {
    const instanceId = 'stock-uuid-001';
    mockStore(
      [{ type: 'stock', id: instanceId }],
      { [instanceId]: { symbols: ['TSLA'] } }
    );
    const { result } = renderHook(() => useFocusStocks());
    expect(result.current.stocks).toEqual([{ sym: 'TSLA', data: null }]);
  });

  it('does NOT set up a polling interval (refresh is SW-driven)', () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['AAPL'] } }
    );
    const spy = vi.spyOn(global, 'setInterval');
    const { unmount } = renderHook(() => useFocusStocks());
    expect(spy.mock.calls.find((c) => c[1] === 5 * 60_000)).toBeUndefined();
    unmount();
    spy.mockRestore();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// useFocusPhoto
// ═════════════════════════════════════════════════════════════════════════════

describe('useFocusPhoto', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getCachedPhotoSync.mockReturnValue(FAKE_PHOTO);
    getCurrentPhoto.mockResolvedValue(FAKE_PHOTO);
    rotatePhoto.mockResolvedValue(FAKE_PHOTO_2);
  });

  it('initializes photo from getCachedPhotoSync()', () => {
    const { result } = renderHook(() => useFocusPhoto());
    expect(result.current.photo).toEqual(FAKE_PHOTO);
  });

  it('initializes slotA with the cached photo URL', () => {
    const { result } = renderHook(() => useFocusPhoto());
    expect(result.current.slotA).toBe(FAKE_PHOTO.regular);
  });

  it('starts with slotB as null', () => {
    const { result } = renderHook(() => useFocusPhoto());
    expect(result.current.slotB).toBeNull();
  });

  it('starts with activeSlot="a"', () => {
    const { result } = renderHook(() => useFocusPhoto());
    expect(result.current.activeSlot).toBe('a');
  });

  it('exposes a rotate function', () => {
    const { result } = renderHook(() => useFocusPhoto());
    expect(typeof result.current.rotate).toBe('function');
  });

  it('exposes photo, slotA, slotB, activeSlot, rotate', () => {
    const { result } = renderHook(() => useFocusPhoto());
    expect(result.current).toHaveProperty('photo');
    expect(result.current).toHaveProperty('slotA');
    expect(result.current).toHaveProperty('slotB');
    expect(result.current).toHaveProperty('activeSlot');
    expect(result.current).toHaveProperty('rotate');
  });

  it('calls getCurrentPhoto on mount to apply the latest photo', async () => {
    renderHook(() => useFocusPhoto());
    await waitFor(() => expect(getCurrentPhoto).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('rotate() calls rotatePhoto() and advances to a new photo', async () => {
    const { result } = renderHook(() => useFocusPhoto());
    // Wait for mount effect (getCurrentPhoto) to settle before rotating
    await waitFor(() => expect(getCurrentPhoto).toHaveBeenCalled(), { timeout: 3000 });

    const slotBefore = result.current.activeSlot;
    await act(async () => { await result.current.rotate(); });

    expect(rotatePhoto).toHaveBeenCalled();
    const slotAfter = result.current.activeSlot;
    // Active slot must have switched
    expect(slotAfter).not.toBe(slotBefore);
    // The newly-active slot now holds the FAKE_PHOTO_2 URL
    const activeUrl = slotAfter === 'a' ? result.current.slotA : result.current.slotB;
    expect(activeUrl).toBe(FAKE_PHOTO_2.regular);
  });

  it('rotate() with a targetId calls jumpToPhotoById', async () => {
    getCurrentPhoto.mockResolvedValue(FAKE_PHOTO_2);
    const { result } = renderHook(() => useFocusPhoto());

    await act(async () => {
      await result.current.rotate('def456');
    });

    expect(jumpToPhotoById).toHaveBeenCalledWith('def456');
  });

  it('rotate() without args calls rotatePhoto(), not jumpToPhotoById', async () => {
    const { result } = renderHook(() => useFocusPhoto());

    await act(async () => {
      await result.current.rotate();
    });

    expect(jumpToPhotoById).not.toHaveBeenCalled();
    expect(rotatePhoto).toHaveBeenCalled();
  });

  it('sets up a 45-minute auto-rotate interval', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { unmount } = renderHook(() => useFocusPhoto());
    const call = setIntervalSpy.mock.calls.find((c) => c[1] === 45 * 60_000);
    expect(call).toBeTruthy();
    unmount();
  });

  it('clears the auto-rotate interval on unmount', () => {
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useFocusPhoto());
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('initializes with null photo when getCachedPhotoSync returns null', () => {
    getCachedPhotoSync.mockReturnValue(null);
    const { result } = renderHook(() => useFocusPhoto());
    expect(result.current.photo).toBeNull();
    expect(result.current.slotA).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// useFocusTimezones
// ═════════════════════════════════════════════════════════════════════════════

describe('useFocusTimezones', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Default: no widget instances in the store
    mockStore([], {});
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('returns [] when there are no widget instances', () => {
    const { result } = renderHook(() => useFocusTimezones());
    expect(result.current).toEqual([]);
  });

  it('returns [] when instances exist but none is a clock widget', () => {
    mockStore(
      [{ type: 'weather', id: 'w1' }, { type: 'stock', id: 's1' }],
      {}
    );
    const { result } = renderHook(() => useFocusTimezones());
    expect(result.current).toEqual([]);
  });

  it('reads timezone settings from the clock widget\'s Zustand entry', () => {
    const clockId = 'clock-uuid-001';
    const timezones = [
      { label: 'New York', timezone: 'America/New_York' },
      { label: 'London', timezone: 'Europe/London' },
    ];
    mockStore(
      [{ type: 'clock', id: clockId }],
      { [clockId]: { timezones } }
    );

    const { result } = renderHook(() => useFocusTimezones());
    expect(result.current).toEqual(timezones);
  });

  it('returns [] when the clock widget settings are absent from the store', () => {
    mockStore([{ type: 'clock', id: 'clock-no-settings' }], {});
    const { result } = renderHook(() => useFocusTimezones());
    expect(result.current).toEqual([]);
  });

  it('returns [] when clock settings has no timezones array', () => {
    const clockId = 'clock-uuid-002';
    mockStore(
      [{ type: 'clock', id: clockId }],
      { [clockId]: { format: '12h' } }
    );
    const { result } = renderHook(() => useFocusTimezones());
    expect(result.current).toEqual([]);
  });
});
