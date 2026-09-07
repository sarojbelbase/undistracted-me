/**
 * Unit tests for src/utilities/siteBlocker.js
 *
 * Covers:
 *  - extractDomain: protocol stripping, www removal, never-block protocols/domains
 *  - blockSite / unblockSite round-trip: localStorage entry + declarativeNetRequest
 *    rule mapping (rule id 1000+, urlFilter `||domain/`)
 *  - unblocking one site keeps other blocks intact (regression guard for the
 *    UNBLOCK_SITE bug where unblock re-blocked instead of removing)
 *  - infinite blocks (-1) and timed blocks
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  extractDomain,
  blockSite,
  unblockSite,
  isBlocked,
  getBlockedSites,
} from '../../../src/utilities/siteBlocker';

// ─── Chrome mock state ──────────────────────────────────────────────────────

let dnrRules;        // simulated declarativeNetRequest dynamic rules
let storageLocal;    // simulated chrome.storage.local

function stubChrome() {
  dnrRules = [];
  storageLocal = {};
  vi.stubGlobal('chrome', {
    runtime: {
      id: 'test-ext',
      getURL: (path) => `chrome-extension://test-ext${path}`,
    },
    storage: {
      local: {
        get: vi.fn(async () => ({ ...storageLocal })),
        set: vi.fn(async (obj) => { Object.assign(storageLocal, obj); }),
      },
    },
    declarativeNetRequest: {
      getDynamicRules: vi.fn(async () => [...dnrRules]),
      updateDynamicRules: vi.fn(async ({ removeRuleIds = [], addRules = [] }) => {
        const remove = new Set(removeRuleIds);
        dnrRules = dnrRules.filter((r) => !remove.has(r.id));
        for (const rule of addRules) {
          dnrRules = dnrRules.filter((r) => r.id !== rule.id);
          dnrRules.push(rule);
        }
      }),
    },
  });
}

beforeEach(() => {
  localStorage.clear();
  stubChrome();
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

// ─── extractDomain ─────────────────────────────────────────────────────────

describe('extractDomain', () => {
  it('strips protocol and www from a full URL', () => {
    expect(extractDomain('https://www.youtube.com/watch?v=abc')).toBe('youtube.com');
  });

  it('lowercases the hostname', () => {
    expect(extractDomain('HTTPS://Example.COM/Path')).toBe('example.com');
  });

  it('accepts a bare domain string', () => {
    expect(extractDomain('reddit.com')).toBe('reddit.com');
  });

  it('rejects never-block protocols', () => {
    expect(extractDomain('chrome://newtab/')).toBeNull();
    expect(extractDomain('chrome-extension://abc/index.html')).toBeNull();
    expect(extractDomain('file:///etc/hosts')).toBeNull();
  });

  it('rejects localhost / loopback', () => {
    expect(extractDomain('localhost')).toBeNull();
    expect(extractDomain('http://127.0.0.1:8080')).toBeNull();
  });

  it('returns null for empty / invalid input', () => {
    expect(extractDomain('')).toBeNull();
    expect(extractDomain(null)).toBeNull();
  });
});

// ─── block / unblock round-trip ────────────────────────────────────────────

describe('blockSite / unblockSite round-trip', () => {
  it('blockSite stores the entry and creates a matching DNR rule', async () => {
    const active = await blockSite('https://www.youtube.com/watch?v=abc', 30);

    expect(active).toHaveLength(1);
    expect(active[0].domain).toBe('youtube.com');
    expect(active[0].blockedUntil).toBeGreaterThan(Date.now());
    expect(isBlocked('youtube.com')).toBe(true);

    // DNR rule mapping: one rule, id 1000, urlFilter `||domain/`, main_frame only
    expect(dnrRules).toHaveLength(1);
    expect(dnrRules[0].id).toBe(1000);
    expect(dnrRules[0].condition.urlFilter).toBe('||youtube.com/');
    expect(dnrRules[0].condition.resourceTypes).toEqual(['main_frame']);
  });

  it('unblockSite removes the entry and the DNR rule', async () => {
    await blockSite('https://youtube.com', 30);
    expect(dnrRules).toHaveLength(1);

    const after = await unblockSite('youtube.com');

    expect(after).toHaveLength(0);
    expect(dnrRules).toHaveLength(0);
    expect(isBlocked('youtube.com')).toBe(false);
    expect(getBlockedSites()).toHaveLength(0);
  });

  it('unblocking one site keeps other blocks intact', async () => {
    await blockSite('youtube.com', 30);
    await blockSite('reddit.com', -1);
    expect(dnrRules).toHaveLength(2);

    await unblockSite('youtube.com');

    expect(dnrRules).toHaveLength(1);
    expect(dnrRules[0].condition.urlFilter).toBe('||reddit.com/');
    expect(isBlocked('youtube.com')).toBe(false);
    expect(isBlocked('reddit.com')).toBe(true);
  });

  it('blockSite with -1 marks an infinite block with no expiry', async () => {
    const active = await blockSite('reddit.com', -1);

    expect(active[0].infinite).toBe(true);
    expect(active[0].blockedUntil).toBeNull();
    expect(isBlocked('reddit.com')).toBe(true);
  });

  it('re-blocking an existing site updates rather than duplicating', async () => {
    await blockSite('youtube.com', 30);
    await blockSite('youtube.com', 60);

    expect(getBlockedSites()).toHaveLength(1);
    expect(dnrRules).toHaveLength(1);
  });
});
