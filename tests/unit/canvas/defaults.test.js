/**
 * First-install defaults — the product-level look shipped to new installs.
 * These values are intentionally asserted so a future edit to defaults.js is a
 * conscious decision, not an accidental visual regression.
 */
import { describe, it, expect } from 'vitest';
import {
  APP_SETTINGS_DEFAULTS as D,
} from '../../../src/constants/defaults';

describe('APP_SETTINGS_DEFAULTS — first-install appearance', () => {
  it('uses the Latte accent by default', () => {
    expect(D.accent).toBe('Latte');
  });

  it('defaults to light theme', () => {
    expect(D.mode).toBe('light');
  });

  it('uses the Paper widget style by default (light and dark prefs)', () => {
    expect(D.cardStyle).toBe('paper');
    expect(D.modePrefs.light.cardStyle).toBe('paper');
    expect(D.modePrefs.dark.cardStyle).toBe('paper');
  });

  it('uses the Motion (animated orb) canvas background by default', () => {
    expect(D.canvasBg).toEqual({ type: 'orb', orbId: 'accent', url: null });
  });
});
