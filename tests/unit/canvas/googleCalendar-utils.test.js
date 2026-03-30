/**
 * Tests for src/utilities/googleCalendar.js
 * Focuses on the localStorage-based cache functions (no Chrome identity needed)
 * and tests getCalendarEvents / isCalendarConnected / disconnectCalendar with
 * a stubbed chrome.identity.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── Stub chrome.identity BEFORE importing the module ──────────────────────
const mockGetAuthToken = vi.fn();
const mockRemoveCachedAuthToken = vi.fn();

vi.stubGlobal('chrome', {
  identity: {
    getAuthToken: mockGetAuthToken,
    removeCachedAuthToken: mockRemoveCachedAuthToken,
  },
  runtime: { lastError: null },
});

// Also stub fetch so google API calls don't go out
vi.stubGlobal('fetch', vi.fn());

import {
  loadCachedGcalEvents,
  clearGcalCache,
  loadCachedProfile,
  clearProfileCache,
  getGoogleProfile,
  getCalendarEvents,
  isCalendarConnected,
  disconnectCalendar,
} from '../../../src/utilities/googleCalendar.js';

// ── Helpers ───────────────────────────────────────────────────────────────
const GCAL_KEY = 'gcal_events_cache';
const PROFILE_KEY = 'gcal_profile_cache';

const sampleEvent = {
  id: 'gcal_abc123',
  title: 'Test Event',
  description: '',
  startDate: '2025-06-10',
  startTime: '09:00',
  endDate: '2025-06-10',
  endTime: '10:00',
  htmlLink: null,
  _source: 'gcal',
};

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  // Reset chrome.runtime.lastError
  global.chrome.runtime.lastError = null;
});

afterEach(() => {
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
// loadCachedGcalEvents
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCachedGcalEvents', () => {
  it('returns [] when cache is empty', () => {
    expect(loadCachedGcalEvents()).toEqual([]);
  });

  it('returns parsed events when cache exists', () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));
    expect(loadCachedGcalEvents()).toEqual([sampleEvent]);
  });

  it('returns [] when cache is invalid JSON', () => {
    localStorage.setItem(GCAL_KEY, 'not-json}}}');
    expect(loadCachedGcalEvents()).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearGcalCache
// ─────────────────────────────────────────────────────────────────────────────
describe('clearGcalCache', () => {
  it('removes the cache key from localStorage', () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));
    clearGcalCache();
    expect(localStorage.getItem(GCAL_KEY)).toBeNull();
  });

  it('is a no-op when cache is already empty', () => {
    expect(() => clearGcalCache()).not.toThrow();
    expect(localStorage.getItem(GCAL_KEY)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// loadCachedProfile
// ─────────────────────────────────────────────────────────────────────────────
describe('loadCachedProfile', () => {
  it('returns null when no profile cached', () => {
    expect(loadCachedProfile()).toBeNull();
  });

  it('returns profile object when cached', () => {
    const profile = { name: 'John', email: 'john@example.com', picture: null };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    expect(loadCachedProfile()).toEqual(profile);
  });

  it('returns null for invalid JSON', () => {
    localStorage.setItem(PROFILE_KEY, 'not-json');
    expect(loadCachedProfile()).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// clearProfileCache
// ─────────────────────────────────────────────────────────────────────────────
describe('clearProfileCache', () => {
  it('removes the profile cache key', () => {
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'John' }));
    clearProfileCache();
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGoogleProfile
// ─────────────────────────────────────────────────────────────────────────────
describe('getGoogleProfile', () => {
  it('returns null when getAuthToken fails (no token)', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: 'Not signed in' };
      cb(undefined);
    });
    const result = await getGoogleProfile();
    expect(result).toBeNull();
  });

  it('returns null when fetch fails', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('fake-token');
    });
    global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    const result = await getGoogleProfile();
    expect(result).toBeNull();
  });

  it('returns profile and caches it when fetch succeeds', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token');
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: 'Alice', email: 'alice@test.com', picture: 'http://img.test/p.jpg' }),
    });
    const result = await getGoogleProfile();
    expect(result).toEqual({ name: 'Alice', email: 'alice@test.com', picture: 'http://img.test/p.jpg' });
    // Should have saved to localStorage
    const cached = loadCachedProfile();
    expect(cached).toEqual(result);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isCalendarConnected
// ─────────────────────────────────────────────────────────────────────────────
describe('isCalendarConnected', () => {
  it('returns false when token is undefined', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: 'Not signed in' };
      cb(undefined);
    });
    expect(await isCalendarConnected()).toBe(false);
  });

  it('returns false when token is empty string', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('');
    });
    expect(await isCalendarConnected()).toBe(false);
  });

  it('returns true when token is valid', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token-123');
    });
    expect(await isCalendarConnected()).toBe(true);
  });

  it('returns false when getAuthToken throws', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: 'Error' };
      cb(undefined);
    });
    expect(await isCalendarConnected()).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// disconnectCalendar
// ─────────────────────────────────────────────────────────────────────────────
describe('disconnectCalendar', () => {
  it('clears both caches', async () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));
    localStorage.setItem(PROFILE_KEY, JSON.stringify({ name: 'Bob' }));

    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('some-token');
    });
    mockRemoveCachedAuthToken.mockImplementation((_opts, cb) => cb());

    await disconnectCalendar();

    expect(localStorage.getItem(GCAL_KEY)).toBeNull();
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
  });

  it('still clears caches even when getAuthToken returns no token', async () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));

    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: 'no token' };
      cb(undefined);
    });

    await disconnectCalendar();

    expect(localStorage.getItem(GCAL_KEY)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getCalendarEvents
// ─────────────────────────────────────────────────────────────────────────────
describe('getCalendarEvents', () => {
  const makeGoogleEvent = (id, summary, start) => ({
    id,
    summary,
    eventType: 'default',
    description: 'desc',
    start: { dateTime: `${start}T09:00:00Z` },
    end: { dateTime: `${start}T10:00:00Z` },
    htmlLink: `https://calendar.google.com/event?eid=${id}`,
  });

  it('fetches events and returns them with changed=true when cache was empty', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token');
    });

    const googleEvents = [makeGoogleEvent('e1', 'Team Standup', '2025-07-01')];
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ items: googleEvents }),
    });

    const result = await getCalendarEvents();
    expect(result.changed).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Team Standup');
    expect(result.events[0]._source).toBe('gcal');
    expect(result.events[0].id).toBe('gcal_e1');
  });

  it('returns changed=false when fetched events match cache', async () => {
    // Pre-populate cache with the same event we'll "fetch"
    const cachedEvents = [{
      id: 'gcal_e1', title: 'Same Event', description: '', startDate: '2025-07-01',
      startTime: '09:00', endDate: '2025-07-01', endTime: '10:00', htmlLink: null, _source: 'gcal'
    }];
    localStorage.setItem(GCAL_KEY, JSON.stringify(cachedEvents));

    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token');
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [{
          id: 'e1', summary: 'Same Event', eventType: 'default', description: '',
          start: { dateTime: '2025-07-01T09:00:00Z' },
          end: { dateTime: '2025-07-01T10:00:00Z' },
          htmlLink: null,
        }]
      }),
    });

    const result = await getCalendarEvents();
    expect(result.changed).toBe(false);
  });

  it('filters out non-default event types', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token');
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [
          makeGoogleEvent('e1', 'Regular event', '2025-07-01'),
          { id: 'e2', summary: 'Birthday', eventType: 'birthday', start: { date: '2025-07-01' }, end: { date: '2025-07-01' } }
        ]
      }),
    });

    const result = await getCalendarEvents();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Regular event');
  });

  it('handles 401 by retrying after removing cached token', async () => {
    let callCount = 0;
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb(`token-${++callCount}`);
    });
    mockRemoveCachedAuthToken.mockImplementation((_opts, cb) => cb());

    // First fetch returns 401
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: 'Unauthorized' })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ items: [makeGoogleEvent('retry1', 'Retry Event', '2025-07-01')] }),
      });

    const result = await getCalendarEvents();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe('Retry Event');
  });

  it('falls back to cache when auth token is unavailable', async () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));

    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: 'Not authorized' };
      cb(undefined);
    });

    const result = await getCalendarEvents();
    expect(result.events).toEqual([sampleEvent]);
    expect(result.changed).toBe(false);
  });

  it('handles API error and falls back to cache', async () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));

    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token');
    });

    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

    const result = await getCalendarEvents();
    expect(result.events).toEqual([sampleEvent]);
    expect(result.changed).toBe(false);
  });

  it('handles events with date-only (all-day) format', async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb('valid-token');
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        items: [{
          id: 'allday1', summary: 'All Day Event', eventType: 'default',
          start: { date: '2025-07-04' },
          end: { date: '2025-07-05' },
          htmlLink: 'https://cal.google.com/allday1',
        }]
      }),
    });

    const result = await getCalendarEvents();
    expect(result.events[0].startTime).toBe('');
    expect(result.events[0].endTime).toBe('');
    expect(result.events[0].startDate).toBe('2025-07-04');
  });
});
