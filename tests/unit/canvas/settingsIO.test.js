/**
 * Tests for src/widgets/settingsIO.js
 *
 * What can go wrong:
 *  – importSettings with a valid settings object should restore every key and
 *    trigger a page reload. If it silently fails one key the user loses that
 *    widget's saved state.
 *  – importSettings with malformed JSON must throw a typed error message so the
 *    UI can show a helpful notification rather than exploding silently.
 *  – importSettings with invalid shape (array, number, null) must throw.
 *  – exportSettings wraps state in undistracted_me and includes exported_at.
 *  – importSettings accepts both the wrapped { undistracted_me: {...} } format
 *    and the raw flat-object fallback (backwards compat).
 *  – resetSettings clears localStorage before reload.
 *  – window.location.reload is dangerous to call in tests — it must be mocked.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportSettings, importSettings, resetSettings } from '../../../src/widgets/settingsIO';

// ────────────────────────────────────────────────────────────────────────────
// Global mocks — prevent real DOM mutation + reload
// ────────────────────────────────────────────────────────────────────────────

const reloadMock = vi.fn();
// jsdom's window.location is non-configurable; delete then redefine.
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: reloadMock },
  writable: true,
  configurable: true,
});

// Prevent real anchor click / blob creation in jsdom
const revokeObjectURL = vi.fn();
global.URL.createObjectURL = vi.fn(() => 'blob:fake');
global.URL.revokeObjectURL = revokeObjectURL;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

// ────────────────────────────────────────────────────────────────────────────
// importSettings — happy paths
// ────────────────────────────────────────────────────────────────────────────

describe('importSettings — happy path', () => {
  it('accepts wrapped format { undistracted_me: {...} }', () => {
    const payload = JSON.stringify({
      undistracted_me: {
        undistracted_settings: JSON.stringify({ state: { mode: 'dark' } }),
      },
    });
    expect(() => importSettings(payload)).not.toThrow();
  });

  it('restores keys from wrapped format into localStorage', () => {
    const payload = JSON.stringify({
      undistracted_me: {
        undistracted_settings: JSON.stringify({ state: { mode: 'dark' } }),
        widget_instances: JSON.stringify([{ id: 'clock', type: 'clock' }]),
      },
    });
    importSettings(payload);
    expect(localStorage.getItem('undistracted_settings')).toBeTruthy();
    expect(localStorage.getItem('widget_instances')).toBeTruthy();
  });

  it('accepts flat object (raw backup without undistracted_me wrapper)', () => {
    const payload = JSON.stringify({
      undistracted_settings: JSON.stringify({ state: { mode: 'light' } }),
    });
    expect(() => importSettings(payload)).not.toThrow();
  });

  it('clears prior localStorage before restoring', () => {
    localStorage.setItem('stale_key', 'stale_value');
    const payload = JSON.stringify({
      undistracted_me: {
        undistracted_settings: '{}',
      },
    });
    importSettings(payload);
    expect(localStorage.getItem('stale_key')).toBeNull();
  });

  it('calls window.location.reload() after import', () => {
    const payload = JSON.stringify({ undistracted_me: { some_key: 'value' } });
    importSettings(payload);
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });

  it('non-string values are JSON-stringified when written to localStorage', () => {
    const instances = [{ id: 'clock', type: 'clock' }];
    const payload = JSON.stringify({
      undistracted_me: { widget_instances: instances },
    });
    importSettings(payload);
    const stored = localStorage.getItem('widget_instances');
    // stored value must be parseable back to the array
    expect(JSON.parse(stored)).toEqual(instances);
  });

  it('string values are stored as-is (not double-stringified)', () => {
    const settings = JSON.stringify({ state: { mode: 'dark' } });
    const payload = JSON.stringify({
      undistracted_me: { undistracted_settings: settings },
    });
    importSettings(payload);
    expect(localStorage.getItem('undistracted_settings')).toBe(settings);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// importSettings — error cases
// ────────────────────────────────────────────────────────────────────────────

describe('importSettings — error cases', () => {
  it('throws "not valid JSON" for a non-JSON string', () => {
    expect(() => importSettings('not json at all')).toThrow('File is not valid JSON.');
  });

  it('throws "not valid JSON" for empty string', () => {
    expect(() => importSettings('')).toThrow('File is not valid JSON.');
  });

  it('throws "not valid JSON" for truncated JSON', () => {
    expect(() => importSettings('{"key": ')).toThrow('File is not valid JSON.');
  });

  it('throws "Invalid settings file" when top-level value is an array', () => {
    expect(() => importSettings(JSON.stringify([1, 2, 3]))).toThrow('Invalid settings file');
  });

  it('throws "Invalid settings file" when top-level value is null', () => {
    expect(() => importSettings('null')).toThrow('Invalid settings file');
  });

  it('throws "Invalid settings file" when top-level value is a number', () => {
    expect(() => importSettings('42')).toThrow('Invalid settings file');
  });

  it('throws "Invalid settings file" when top-level value is a string', () => {
    expect(() => importSettings('"just a string"')).toThrow('Invalid settings file');
  });
});

// ────────────────────────────────────────────────────────────────────────────
// exportSettings
// ────────────────────────────────────────────────────────────────────────────

describe('exportSettings', () => {
  it('creates an anchor element, clicks it, then removes it', () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild');
    const removeSpy = vi.spyOn(document.body, 'removeChild');
    exportSettings();
    expect(appendSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
  });

  it('calls URL.createObjectURL', () => {
    exportSettings();
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('calls URL.revokeObjectURL to free memory', () => {
    exportSettings();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
  });

  it('file download name starts with "undistracted-me-"', () => {
    let capturedAnchor;
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => {
      capturedAnchor = el;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => { });
    exportSettings();
    expect(capturedAnchor?.download).toMatch(/^undistracted-me-\d{4}-\d{2}-\d{2}\.json$/);
  });

  it('export payload includes undistracted_me key', () => {
    localStorage.setItem('undistracted_settings', JSON.stringify({ state: { mode: 'light' } }));

    let blob;
    global.URL.createObjectURL = vi.fn((b) => { blob = b; return 'blob:fake'; });
    vi.spyOn(document.body, 'appendChild').mockImplementation(() => { });
    vi.spyOn(document.body, 'removeChild').mockImplementation(() => { });

    exportSettings();

    // Read Blob content
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const parsed = JSON.parse(e.target.result);
        expect(parsed).toHaveProperty('undistracted_me');
        expect(parsed).toHaveProperty('exported_at');
        resolve();
      };
      reader.readAsText(blob);
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// resetSettings
// ────────────────────────────────────────────────────────────────────────────

describe('resetSettings', () => {
  it('clears localStorage', () => {
    localStorage.setItem('undistracted_settings', '{"state":{}}');
    localStorage.setItem('widget_instances', '[]');
    resetSettings();
    expect(localStorage.length).toBe(0);
  });

  it('calls window.location.reload()', () => {
    resetSettings();
    expect(reloadMock).toHaveBeenCalledTimes(1);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// importFromFile — DOM file input creation
// ────────────────────────────────────────────────────────────────────────────

import { importFromFile } from '../../../src/widgets/settingsIO';

describe('importFromFile', () => {
  it('creates a file input and clicks it', () => {
    const input = document.createElement('input');
    const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => { });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(input);

    importFromFile(vi.fn());

    expect(input.type).toBe('file');
    expect(input.accept).toBe('.json');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('calls importSettings when a valid file is selected', async () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => { });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(input);

    importFromFile(vi.fn());

    // Simulate a file selection
    const validPayload = JSON.stringify({
      undistracted_me: { undistracted_settings: '{}' },
    });
    const file = { text: vi.fn().mockResolvedValue(validPayload) };
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    // Trigger the onchange handler
    await input.onchange({ target: { files: [file] } });

    expect(reloadMock).toHaveBeenCalled();
  });

  it('calls onError when file contains invalid JSON', async () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => { });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(input);

    const onError = vi.fn();
    importFromFile(onError);

    const file = { text: vi.fn().mockResolvedValue('not valid json!!!') };
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await input.onchange({ target: { files: [file] } });

    expect(onError).toHaveBeenCalledWith(expect.stringContaining('JSON'));
  });

  it('does nothing when no file is selected (empty files list)', async () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => { });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(input);

    const onError = vi.fn();
    importFromFile(onError);

    // Trigger onchange with no files
    await input.onchange({ target: { files: [] } });

    expect(reloadMock).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('calls onError when file.text() throws', async () => {
    const input = document.createElement('input');
    vi.spyOn(input, 'click').mockImplementation(() => { });
    vi.spyOn(document, 'createElement').mockReturnValueOnce(input);

    const onError = vi.fn();
    importFromFile(onError);

    const file = { text: vi.fn().mockRejectedValue(new Error('read error')) };
    Object.defineProperty(input, 'files', { value: [file], configurable: true });

    await input.onchange({ target: { files: [file] } });

    expect(onError).toHaveBeenCalledWith('read error');
  });
});
