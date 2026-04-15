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

vi.mock('../../../src/widgets/weather/utils.jsx', () => ({
  API_KEY: 'test-key',
  getCoords: vi.fn(),
  fetchOpenMeteo: vi.fn(),
  parseWeather: vi.fn(),
}));

vi.mock('../../../src/widgets/stock/utils', () => ({
  fetchChart: vi.fn(),
}));

vi.mock('../../../src/utilities/unsplash', () => ({
  getCachedPhotoSync: vi.fn(),
  getCurrentPhoto: vi.fn(),
  rotatePhoto: vi.fn(),
  jumpToPhotoById: vi.fn(),
}));

vi.mock('../../../src/store', () => ({
  useWidgetInstancesStore: vi.fn(),
}));

// Prevent heavy spotify utils import chain from loading
vi.mock('../../../src/widgets/spotify/utils', () => ({
  getCurrentPlayback: vi.fn(),
  isSpotifyConnected: vi.fn(() => false),
  setPlayPause: vi.fn(),
  skipNext: vi.fn(),
  skipPrev: vi.fn(),
}));

// ─── Import mocked modules so we can configure their behaviour per-test ───────

import {
  API_KEY as _,        // used only to confirm the mock was applied
  getCoords,
  fetchOpenMeteo,
  parseWeather,
} from '../../../src/widgets/weather/utils.jsx';

import { fetchChart } from '../../../src/widgets/stock/utils';

import {
  getCachedPhotoSync,
  getCurrentPhoto,
  rotatePhoto,
  jumpToPhotoById,
} from '../../../src/utilities/unsplash';

import { useWidgetInstancesStore } from '../../../src/store';

// ─── Import hooks under test ──────────────────────────────────────────────────

import {
  useFocusWeather,
  useFocusStocks,
  useFocusPhoto,
  useFocusTimezones,
} from '../../../src/components/FocusMode/hooks.js';

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
  beforeEach(() => {
    vi.clearAllMocks();
    // Default store state: no instances, no settings → weatherSettings = null
    mockStore([], {});
    // Default: location lookup succeeds
    getCoords.mockResolvedValue({ lat: 40.7128, lon: -74.006 });
    fetchOpenMeteo.mockResolvedValue({});
    parseWeather.mockReturnValue(FAKE_WEATHER);
  });

  it('returns null initially (before async fetch resolves)', () => {
    // Don't resolve the fetch yet
    fetchOpenMeteo.mockReturnValue(new Promise(() => { }));
    const { result } = renderHook(() => useFocusWeather());
    expect(result.current).toBeNull();
  });

  it('sets weather state after successful fetch without saved location', async () => {
    const { result } = renderHook(() => useFocusWeather());
    await waitFor(() => expect(result.current).not.toBeNull(), { timeout: 3000 });
    expect(result.current).toMatchObject({ ...FAKE_WEATHER, unit: 'metric' });
  });

  it('uses location from Zustand widgetSettings (weather widget)', async () => {
    // Seed the store with a weather instance and its settings
    mockStore(
      [{ type: 'weather', id: 'weather' }],
      { weather: { location: { lat: 27.7, lon: 85.3 }, unit: 'imperial' } }
    );
    renderHook(() => useFocusWeather());
    await waitFor(() => expect(fetchOpenMeteo).toHaveBeenCalled(), { timeout: 3000 });
    expect(fetchOpenMeteo).toHaveBeenCalledWith(27.7, 85.3, 'imperial');
    expect(getCoords).not.toHaveBeenCalled();
  });

  it('uses location from instance-id-scoped widgetSettings when instance id differs', async () => {
    const instanceId = 'wid-uuid-001';
    mockStore(
      [{ type: 'weather', id: instanceId }],
      { [instanceId]: { location: { lat: 51.5, lon: -0.1 }, unit: 'metric' } }
    );
    renderHook(() => useFocusWeather());
    await waitFor(() => expect(fetchOpenMeteo).toHaveBeenCalled(), { timeout: 3000 });
    expect(fetchOpenMeteo).toHaveBeenCalledWith(51.5, -0.1, 'metric');
  });

  it('calls getCoords when no saved location is found', async () => {
    renderHook(() => useFocusWeather());
    await waitFor(() => expect(getCoords).toHaveBeenCalled(), { timeout: 3000 });
  });

  it('stays null if getCoords rejects and no saved location', async () => {
    getCoords.mockRejectedValue(new Error('Permission denied'));
    const { result } = renderHook(() => useFocusWeather());
    await act(async () => { await new Promise((r) => setTimeout(r, 100)); });
    expect(result.current).toBeNull();
  });

  it('sets up a 30-minute refresh interval', () => {
    const spy = vi.spyOn(global, 'setInterval');
    const { unmount } = renderHook(() => useFocusWeather());
    expect(spy.mock.calls.some((c) => c[1] === 30 * 60_000)).toBe(true);
    unmount();
    spy.mockRestore();
  });

  it('clears the interval on unmount', () => {
    const spy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useFocusWeather());
    unmount();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
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
    fetchChart.mockResolvedValue({ close: 150 });
  });

  it('returns [] initially', () => {
    const { result } = renderHook(() => useFocusStocks());
    expect(result.current).toEqual([]);
  });

  it('stays [] when no stock symbols are configured', () => {
    const { result } = renderHook(() => useFocusStocks());
    expect(result.current).toEqual([]);
    expect(fetchChart).not.toHaveBeenCalled();
  });

  it('loads stocks from Zustand widgetSettings (stock widget)', async () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['AAPL', 'GOOGL'] } }
    );

    const { result } = renderHook(() => useFocusStocks());

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0), { timeout: 3000 });
    expect(fetchChart).toHaveBeenCalledWith('AAPL');
    expect(fetchChart).toHaveBeenCalledWith('GOOGL');
    expect(result.current).toHaveLength(2);
    expect(result.current[0].sym).toBe('AAPL');
    expect(result.current[1].sym).toBe('GOOGL');
  });

  it('reads symbols from instance-id-scoped widgetSettings when instance id differs', async () => {
    const instanceId = 'stock-uuid-001';
    mockStore(
      [{ type: 'stock', id: instanceId }],
      { [instanceId]: { symbols: ['TSLA'] } }
    );

    const { result } = renderHook(() => useFocusStocks());

    await waitFor(() => expect(result.current.length).toBeGreaterThan(0), { timeout: 3000 });
    expect(fetchChart).toHaveBeenCalledWith('TSLA');
  });

  it('includes null data for symbols whose fetch failed', async () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['FAIL', 'OK'] } }
    );
    fetchChart
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ close: 200 });

    const { result } = renderHook(() => useFocusStocks());

    await waitFor(() => expect(result.current.length).toBe(2), { timeout: 3000 });
    expect(result.current[0]).toEqual({ sym: 'FAIL', data: null });
    expect(result.current[1]).toEqual({ sym: 'OK', data: { close: 200 } });
  });

  it('sets up a 5-minute refresh interval', () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['AAPL'] } }
    );
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { unmount } = renderHook(() => useFocusStocks());
    const call = setIntervalSpy.mock.calls.find((c) => c[1] === 5 * 60_000);
    expect(call).toBeTruthy();
    unmount();
  });

  it('does NOT set up an interval when no symbols are configured', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const { unmount } = renderHook(() => useFocusStocks());
    // No 5-minute interval should have been registered
    const call = setIntervalSpy.mock.calls.find((c) => c[1] === 5 * 60_000);
    expect(call).toBeUndefined();
    unmount();
  });

  it('clears the interval on unmount', () => {
    mockStore(
      [{ type: 'stock', id: 'stock' }],
      { stock: { symbols: ['AAPL'] } }
    );
    const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
    const { unmount } = renderHook(() => useFocusStocks());
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
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
