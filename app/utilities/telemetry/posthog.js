/**
 * PostHog provider: the ONLY file that knows about the PostHog SDK.
 *
 * The telemetry facade (`./index.js`) talks to a generic provider with four
 * methods: `init`, `identify`, `capture`, `isReady`. To swap analytics vendors
 * (Plausible, Amplitude, Mixpanel, Umami, …), write a new provider file exposing
 * the same four methods and change the single `createProvider()` reference in
 * `index.js`. No call site, event or component changes.
 */

const EXTENSION_SAFE_FLAGS = {
  cross_subdomain_cookie: false, // no cookies: extension/new-tab context
  disable_external_dependency_loading: true, // never injects a <script> (CSP-safe)
  disable_session_recording: true, // no content is captured
  disable_surveys: true,
  autocapture: false,
  capture_pageview: false,
  capture_pageleave: false,
  persistence: 'localStorage',
  advanced_disable_decide: true,
};

export function createPostHogProvider() {
  let client = null;

  return {
    async init({ key, host }) {
      const mod = await import('posthog-js');
      client = mod.default;
      client.init(key, { api_host: host, ...EXTENSION_SAFE_FLAGS });
    },

    identify(installId) {
      client?.identify(installId);
    },

    capture(event, props) {
      client?.capture(event, props);
    },

    isReady() {
      return !!client;
    },
  };
}
