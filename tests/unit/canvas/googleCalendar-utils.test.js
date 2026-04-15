/**
 * Tests for src/utilities/googleCalendar.js
 *
 * Uses vi.resetModules() + dynamic imports in beforeEach to reset
 * module-level memory caches (_eventsMemCache, _profileMemCache) between tests.
 * chrome.storage.local is mocked via an in-memory chromeMockStorage object.
 * chrome.identity.launchWebAuthFlow is included so isWebPath() returns false
 * and getTokenChrome() is used (not the web popup path).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const chromeMockStorage = {};
const mockGetAuthToken = vi.fn();
const mockRemoveCachedAuthToken = vi.fn();

function setupChromeMock() {
  vi.stubGlobal("chrome", {
    identity: {
      getAuthToken: mockGetAuthToken,
      removeCachedAuthToken: mockRemoveCachedAuthToken,
      launchWebAuthFlow: vi.fn(),
    },
    runtime: { lastError: null },
    storage: {
      local: {
        get: vi.fn((key) =>
          Promise.resolve(key in chromeMockStorage ? { [key]: chromeMockStorage[key] } : {}),
        ),
        set: vi.fn((obj) => { Object.assign(chromeMockStorage, obj); return Promise.resolve(); }),
        remove: vi.fn((key) => { delete chromeMockStorage[key]; return Promise.resolve(); }),
      },
    },
  });
}

vi.stubGlobal("fetch", vi.fn());

let loadCachedGcalEvents, clearGcalCache, loadCachedProfile, clearProfileCache,
  getGoogleProfile, getCalendarEvents, isCalendarConnected, disconnectCalendar;

beforeEach(async () => {
  Object.keys(chromeMockStorage).forEach((k) => delete chromeMockStorage[k]);
  localStorage.clear();
  vi.clearAllMocks();
  setupChromeMock();
  vi.resetModules();
  const mod = await import("../../../src/utilities/googleCalendar.js");
  ({
    loadCachedGcalEvents, clearGcalCache, loadCachedProfile, clearProfileCache,
    getGoogleProfile, getCalendarEvents, isCalendarConnected, disconnectCalendar
  } = mod);
  global.chrome.runtime.lastError = null;
});

afterEach(() => {
  localStorage.clear();
  Object.keys(chromeMockStorage).forEach((k) => delete chromeMockStorage[k]);
});

const GCAL_KEY = "gcal_events_cache";
const PROFILE_KEY = "gcal_profile_cache";

const sampleEvent = {
  id: "gcal_abc123", title: "Test Event", description: "",
  startDate: "2025-06-10", startTime: "09:00",
  endDate: "2025-06-10", endTime: "10:00",
  htmlLink: null, meetLink: null, _source: "gcal",
};

describe("loadCachedGcalEvents", () => {
  it("returns [] when cache is empty", async () => {
    expect(await loadCachedGcalEvents()).toEqual([]);
  });

  it("returns parsed events when cache exists in chrome.storage.local", async () => {
    chromeMockStorage[GCAL_KEY] = [sampleEvent];
    expect(await loadCachedGcalEvents()).toEqual([sampleEvent]);
  });

  it("returns [] when chrome.storage.local has no entry", async () => {
    expect(await loadCachedGcalEvents()).toEqual([]);
  });

  it("migrates legacy localStorage key to chrome.storage.local on first read", async () => {
    localStorage.setItem(GCAL_KEY, JSON.stringify([sampleEvent]));
    const result = await loadCachedGcalEvents();
    expect(localStorage.getItem(GCAL_KEY)).toBeNull();
    expect(result).toEqual([sampleEvent]);
  });
});

describe("clearGcalCache", () => {
  it("removes the cache key from chrome.storage.local", async () => {
    chromeMockStorage[GCAL_KEY] = [sampleEvent];
    await clearGcalCache();
    expect(chromeMockStorage[GCAL_KEY]).toBeUndefined();
  });

  it("is a no-op when cache is already empty", async () => {
    await expect(clearGcalCache()).resolves.not.toThrow();
    expect(chromeMockStorage[GCAL_KEY]).toBeUndefined();
  });
});

describe("loadCachedProfile", () => {
  it("returns null when no profile cached", async () => {
    expect(await loadCachedProfile()).toBeNull();
  });

  it("returns profile object when cached in chrome.storage.local", async () => {
    const profile = { name: "John", email: "john@example.com", picture: null };
    chromeMockStorage[PROFILE_KEY] = profile;
    expect(await loadCachedProfile()).toEqual(profile);
  });

  it("migrates legacy localStorage profile", async () => {
    const profile = { name: "Legacy", email: "l@test.com", picture: null };
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    const result = await loadCachedProfile();
    expect(localStorage.getItem(PROFILE_KEY)).toBeNull();
    expect(result).toEqual(profile);
  });
});

describe("clearProfileCache", () => {
  it("removes the profile cache key from chrome.storage.local", async () => {
    chromeMockStorage[PROFILE_KEY] = { name: "John" };
    await clearProfileCache();
    expect(chromeMockStorage[PROFILE_KEY]).toBeUndefined();
  });
});

describe("getGoogleProfile", () => {
  it("returns null when getAuthToken fails", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: "Not signed in" };
      cb(undefined);
    });
    expect(await getGoogleProfile()).toBeNull();
  });

  it("returns null when fetch fails", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb("fake-token");
    });
    global.fetch.mockResolvedValueOnce({ ok: false, status: 401 });
    expect(await getGoogleProfile()).toBeNull();
  });

  it("returns profile and caches it when fetch succeeds", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb("valid-token");
    });
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "Alice", email: "alice@test.com", picture: "http://img.test/p.jpg" }),
    });
    const result = await getGoogleProfile();
    expect(result).toEqual({ name: "Alice", email: "alice@test.com", picture: "http://img.test/p.jpg" });
    const cached = await loadCachedProfile();
    expect(cached).toEqual(result);
  });
});

describe("isCalendarConnected", () => {
  it("returns false when token is undefined", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: "Not signed in" };
      cb(undefined);
    });
    expect(await isCalendarConnected()).toBe(false);
  });

  it("returns false when token is empty string", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb("");
    });
    expect(await isCalendarConnected()).toBe(false);
  });

  it("returns true when token is valid", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb("valid-token-123");
    });
    expect(await isCalendarConnected()).toBe(true);
  });

  it("returns false when getAuthToken throws", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: "Error" };
      cb(undefined);
    });
    expect(await isCalendarConnected()).toBe(false);
  });
});

describe("disconnectCalendar", () => {
  it("clears both caches from chrome.storage.local", async () => {
    chromeMockStorage[GCAL_KEY] = [sampleEvent];
    chromeMockStorage[PROFILE_KEY] = { name: "Bob" };
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = null;
      cb("some-token");
    });
    mockRemoveCachedAuthToken.mockImplementation((_opts, cb) => cb());
    await disconnectCalendar();
    await Promise.resolve();
    expect(chromeMockStorage[GCAL_KEY]).toBeUndefined();
    expect(chromeMockStorage[PROFILE_KEY]).toBeUndefined();
  });

  it("still clears caches even when getAuthToken returns no token", async () => {
    chromeMockStorage[GCAL_KEY] = [sampleEvent];
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: "no token" };
      cb(undefined);
    });
    await disconnectCalendar();
    await Promise.resolve();
    expect(chromeMockStorage[GCAL_KEY]).toBeUndefined();
  });
});

describe("getCalendarEvents", () => {
  const makeGoogleEvent = (id, summary, start) => ({
    id, summary, eventType: "default", description: "desc",
    start: { dateTime: start + "T09:00:00Z" },
    end: { dateTime: start + "T10:00:00Z" },
    htmlLink: "https://calendar.google.com/event?eid=" + id,
  });

  it("fetches events and returns them with changed=true when cache was empty", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => { global.chrome.runtime.lastError = null; cb("valid-token"); });
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({ items: [makeGoogleEvent("e1", "Team Standup", "2025-07-01")] }),
    });
    const result = await getCalendarEvents();
    expect(result.changed).toBe(true);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Team Standup");
    expect(result.events[0]._source).toBe("gcal");
    expect(result.events[0].id).toBe("gcal_e1");
  });

  it("returns changed=false when fetched events match cache", async () => {
    const cachedEvents = [{
      id: "gcal_e1", title: "Same Event", description: "",
      startDate: "2025-07-01", startTime: "09:00",
      endDate: "2025-07-01", endTime: "10:00",
      htmlLink: "https://calendar.google.com/event?eid=e1",
      meetLink: null, _source: "gcal"
    }];
    chromeMockStorage[GCAL_KEY] = cachedEvents;
    mockGetAuthToken.mockImplementation((_opts, cb) => { global.chrome.runtime.lastError = null; cb("valid-token"); });
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        items: [{
          id: "e1", summary: "Same Event", eventType: "default", description: "",
          start: { dateTime: "2025-07-01T09:00:00Z" },
          end: { dateTime: "2025-07-01T10:00:00Z" },
          htmlLink: "https://calendar.google.com/event?eid=e1",
        }]
      }),
    });
    const result = await getCalendarEvents();
    expect(result.changed).toBe(false);
  });

  it("filters out non-default event types", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => { global.chrome.runtime.lastError = null; cb("valid-token"); });
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        items: [
          makeGoogleEvent("e1", "Regular event", "2025-07-01"),
          { id: "e2", summary: "Birthday", eventType: "birthday", start: { date: "2025-07-01" }, end: { date: "2025-07-01" } }
        ]
      }),
    });
    const result = await getCalendarEvents();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Regular event");
  });

  it("handles 401 by retrying after removing cached token", async () => {
    let callCount = 0;
    mockGetAuthToken.mockImplementation((_opts, cb) => { global.chrome.runtime.lastError = null; cb("token-" + (++callCount)); });
    mockRemoveCachedAuthToken.mockImplementation((_opts, cb) => cb());
    global.fetch
      .mockResolvedValueOnce({ ok: false, status: 401, statusText: "Unauthorized" })
      .mockResolvedValueOnce({
        ok: true, status: 200,
        json: async () => ({ items: [makeGoogleEvent("retry1", "Retry Event", "2025-07-01")] }),
      });
    const result = await getCalendarEvents();
    expect(result.events).toHaveLength(1);
    expect(result.events[0].title).toBe("Retry Event");
  });

  it("throws when auth token is unavailable", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => {
      global.chrome.runtime.lastError = { message: "Not authorized" };
      cb(undefined);
    });
    await expect(getCalendarEvents()).rejects.toThrow();
  });

  it("throws on API error", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => { global.chrome.runtime.lastError = null; cb("valid-token"); });
    global.fetch.mockResolvedValueOnce({ ok: false, status: 500, statusText: "Server Error" });
    await expect(getCalendarEvents()).rejects.toThrow();
  });

  it("handles events with date-only (all-day) format", async () => {
    mockGetAuthToken.mockImplementation((_opts, cb) => { global.chrome.runtime.lastError = null; cb("valid-token"); });
    global.fetch.mockResolvedValueOnce({
      ok: true, status: 200,
      json: async () => ({
        items: [{
          id: "allday1", summary: "All Day Event", eventType: "default",
          start: { date: "2025-07-04" }, end: { date: "2025-07-05" },
          htmlLink: "https://cal.google.com/allday1",
        }]
      }),
    });
    const result = await getCalendarEvents();
    expect(result.events[0].startTime).toBe("");
    expect(result.events[0].endTime).toBe("");
    expect(result.events[0].startDate).toBe("2025-07-04");
  });
});
