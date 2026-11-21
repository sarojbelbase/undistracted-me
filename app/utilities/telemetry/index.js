/**
 * Telemetry facade: the app's only analytics entry point.
 *
 * Provider-agnostic: every call site talks to this module, never to a vendor
 * SDK. The vendor is isolated behind a small `provider` interface (init /
 * identify / capture / isReady) so swapping PostHog for another library later is
 * a one-line change in `createProvider()` below.
 *
 * Gated on `VITE_POSTHOG_KEY`: without a key (local dev, unit tests) everything
 * here is a no-op and the vendor SDK is never loaded. Events captured before
 * the SDK finishes its async load are buffered and flushed, so first-render
 * events are never lost to the dynamic-import race.
 */

import { getPlatform } from '../../constants/env';
import { STORAGE_KEYS } from '../../constants/storageKeys';
import { TELEMETRY_EVENTS, widgetEvent } from './constants';
import { createPostHogProvider } from './posthog';

export { TELEMETRY_EVENTS, widgetEvent, WIDGET_EVENT_PREFIX } from './constants';

const KEY = import.meta.env.VITE_POSTHOG_KEY;
const HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

// ── Provider (THE swap point) ────────────────────────────────────────────────
// To change analytics vendors, implement the same four methods and replace this
// one call. Nothing else in the app needs to change.
const createProvider = () => createPostHogProvider();

let provider = createProvider();
let ready = false; // true once the SDK is loaded and initialised
let initPromise = null;
const pendingEvents = [];

/**
 * Stable anonymous install id, persisted in localStorage. Used as the vendor's
 * `distinct_id` so "unique users" == "unique installs". A random id, not
 * derived from any personal data.
 */
function getInstallId() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INSTALL_ID);
    if (stored) return stored;
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(STORAGE_KEYS.INSTALL_ID, id);
    return id;
  } catch {
    return null;
  }
}

/**
 * Load and initialise the analytics provider (idempotent). Flushes any events
 * buffered before the SDK was ready, pins the distinct_id to our install id,
 * and emits one guaranteed `app_opened` event per session.
 *
 * `appOpened: false` skips the session ping: used by auxiliary surfaces (the
 * blocked-site page) that share the install id but are not the app itself.
 */
export function initTelemetry({ appOpened = true } = {}) {
  if (!KEY) return Promise.resolve();
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await provider.init({ key: KEY, host: HOST });
      ready = true;

      const installId = getInstallId();
      if (installId) provider.identify(installId);

      for (const [event, props] of pendingEvents.splice(0)) {
        provider.capture(event, props);
      }

      if (appOpened) {
        provider.capture(TELEMETRY_EVENTS.APP_OPENED, { platform: getPlatform() });
      }
    } catch {
      provider = createProvider();
      ready = false;
      pendingEvents.length = 0; // never let telemetry break the app
    }
  })();

  return initPromise;
}

/** Capture an event now, or buffer it until the SDK is ready. */
function send(event, props) {
  if (ready) {
    try {
      provider.capture(event, props);
    } catch {
      /* never throw from telemetry */
    }
  } else {
    pendingEvents.push([event, props]);
  }
}

/**
 * Capture any event by name (use a `TELEMETRY_EVENTS.*` constant). No-op unless
 * a key is configured.
 */
export function track(eventName, props = {}) {
  if (!KEY) return;
  send(eventName, props);
}

/**
 * Capture a widget event: `widget_<verb>` with a `widget_type` prop derived
 * dynamically from the caller. The verb → event-name mapping is driven by
 * `widgetEvent()` in constants.js.
 */
export function trackWidgetEvent(verb, widgetType, props = {}) {
  track(widgetEvent(verb), { widget_type: widgetType, ...props });
}
