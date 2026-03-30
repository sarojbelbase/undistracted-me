/**
 * Tests for src/utilities/chrome.js — stampThisIntoExtensionIcon
 *
 * What can go wrong:
 *  – When running outside the extension context (dev server, tests) chrome is
 *    undefined. Any non-guarded call to chrome.action throws a ReferenceError.
 *  – If setBadgeText is called with a non-string the badge silently shows nothing
 *    on some versions of Chrome.
 *  – The catch block suppresses badge errors; this is intentional — a badge
 *    failure should never crash the tab. Tests confirm no throw surfaces.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { stampThisIntoExtensionIcon } from '../../../src/utilities/chrome';

afterEach(() => {
  vi.unstubAllGlobals();
});

// ────────────────────────────────────────────────────────────────────────────
// When chrome API is unavailable (dev environment, tests)
// ────────────────────────────────────────────────────────────────────────────

describe('stampThisIntoExtensionIcon — no chrome API', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', undefined);
  });

  it('does not throw when chrome is undefined', async () => {
    await expect(stampThisIntoExtensionIcon('15')).resolves.not.toThrow();
  });

  it('resolves (does not reject) when chrome is undefined', async () => {
    await expect(stampThisIntoExtensionIcon('15')).resolves.toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// When chrome API is available (extension context)
// ────────────────────────────────────────────────────────────────────────────

describe('stampThisIntoExtensionIcon — chrome API present', () => {
  const setBadgeText = vi.fn().mockResolvedValue(undefined);
  const setBadgeBackgroundColor = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.stubGlobal('chrome', {
      action: { setBadgeText, setBadgeBackgroundColor },
    });
    vi.clearAllMocks();
  });

  it('calls setBadgeBackgroundColor with yellow (#ffc107)', async () => {
    await stampThisIntoExtensionIcon('15');
    expect(setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#ffc107' });
  });

  it('calls setBadgeText with the provided text', async () => {
    await stampThisIntoExtensionIcon('15');
    expect(setBadgeText).toHaveBeenCalledWith({ text: '15' });
  });

  it('passes any string text to setBadgeText', async () => {
    await stampThisIntoExtensionIcon('२३');
    expect(setBadgeText).toHaveBeenCalledWith({ text: '२३' });
  });

  it('does not throw when setBadgeText rejects (error is caught)', async () => {
    setBadgeText.mockRejectedValueOnce(new Error('Extension context invalid'));
    await expect(stampThisIntoExtensionIcon('15')).resolves.toBeUndefined();
  });

  it('does not throw when setBadgeBackgroundColor rejects', async () => {
    setBadgeBackgroundColor.mockRejectedValueOnce(new Error('Context invalidated'));
    await expect(stampThisIntoExtensionIcon('15')).resolves.toBeUndefined();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// When chrome exists but chrome.action is absent (Firefox MV2 compat)
// ────────────────────────────────────────────────────────────────────────────

describe('stampThisIntoExtensionIcon — chrome exists but no .action', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {}); // chrome defined, but no .action
  });

  it('does not throw when chrome.action is undefined', async () => {
    await expect(stampThisIntoExtensionIcon('5')).resolves.toBeUndefined();
  });
});
