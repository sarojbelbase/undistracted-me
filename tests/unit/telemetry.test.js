import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the PostHog SDK — we assert on what the telemetry module *would* send
// without hitting the network. The default export is the singleton instance.
const mockPostHog = {
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
};
vi.mock('posthog-js', () => ({ default: mockPostHog }));

// Load the module fresh per test (isolates its module-level `posthog`/queue
// state) and force a test key so the enabled path is exercised regardless of
// whether a real `.env` is present.
let telemetry;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
  vi.clearAllMocks();
  telemetry = await import('../../app/utilities/telemetry');
});

describe('telemetry (PostHog)', () => {
  it('buffers events captured before init and flushes them once ready', async () => {
    const { trackWidgetEvent, trackWidgetRendered, initTelemetry } = telemetry;

    // Fired during first render, before the async SDK load resolves.
    trackWidgetEvent('added', 'clock');
    trackWidgetRendered('clock');
    expect(mockPostHog.capture).not.toHaveBeenCalled();

    await initTelemetry();

    expect(mockPostHog.init).toHaveBeenCalledWith(
      'phc_test_key',
      expect.objectContaining({ api_host: 'https://us.i.posthog.com' }),
    );
    // Buffered events are flushed (the first-event race is closed).
    expect(mockPostHog.capture).toHaveBeenCalledWith('widget_added', {
      widget_type: 'clock',
    });
    expect(mockPostHog.capture).toHaveBeenCalledWith('widget_rendered', {
      widget_type: 'clock',
    });
    // A guaranteed per-session custom event so PostHog is never "waiting".
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      'app_opened',
      expect.any(Object),
    );
  });

  it('captures immediately once the SDK is loaded', async () => {
    const { initTelemetry, trackWidgetEvent } = telemetry;
    await initTelemetry();
    mockPostHog.capture.mockClear();

    trackWidgetEvent('started', 'pomodoro', { session_type: 'focus' });

    expect(mockPostHog.capture).toHaveBeenCalledWith('widget_started', {
      widget_type: 'pomodoro',
      session_type: 'focus',
    });
  });

  it('dedupes widget_rendered to once per type per session', async () => {
    const { initTelemetry, trackWidgetRendered } = telemetry;
    await initTelemetry();
    mockPostHog.capture.mockClear();

    trackWidgetRendered('clock');
    trackWidgetRendered('clock');
    trackWidgetRendered('weather');

    expect(mockPostHog.capture).toHaveBeenCalledTimes(2); // clock once + weather
  });

  it('identifies with a stable install id for unique-install counts', async () => {
    const { initTelemetry } = telemetry;
    await initTelemetry();
    expect(mockPostHog.identify).toHaveBeenCalledTimes(1);
    expect(mockPostHog.identify.mock.calls[0][0]).toMatch(/^[a-z0-9]+-[a-z0-9]+$/);
  });
});
