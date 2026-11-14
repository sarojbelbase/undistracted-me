import './themeInit.js'; // must be first — sets data-mode & CSS vars before React renders
import ReactDOM from 'react-dom/client';
import App from './App';
import { getPlatform, PLATFORMS, API_BASE_URL } from './constants/env';

// ── Auto-hide scrollbars ──────────────────────────────────────────────────────
// Add .is-scrolling to any element while it's scrolling; remove 1s after it stops.
// CSS makes the thumb transparent by default and visible only with that class.
{
  const timers = new WeakMap();
  document.addEventListener('scroll', (e) => {
    const el = e.target;
    if (!(el instanceof Element)) return;
    el.classList.add('is-scrolling');
    if (timers.has(el)) clearTimeout(timers.get(el));
    timers.set(el, setTimeout(() => {
      el.classList.remove('is-scrolling');
      timers.delete(el);
    }, 1000));
  }, { capture: true, passive: true });
}

// ── Cloudflare Web Analytics (web app only) ───────────────────────────────────
// Only the hosted web app (app.undistracted.me) is tracked. The extension's
// CSP blocks third-party scripts anyway, but we skip explicitly so the
// extension build ships no tracker at all and never fires a CSP violation.
// Token comes from VITE_CF_BEACON_TOKEN; skipped when unset (local dev).
if (
  getPlatform() !== PLATFORMS.EXTENSION &&
  import.meta.env.VITE_CF_BEACON_TOKEN
) {
  const beacon = document.createElement('script');
  beacon.defer = true;
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = JSON.stringify({
    token: import.meta.env.VITE_CF_BEACON_TOKEN,
  });
  document.head.appendChild(beacon);
}

// ── Count a web-app visit (hosted app only, once per browser session) ─────────
// Increments the /visits KV counter on api.undistracted.me. Strictly gated to
// app.undistracted.me so extension new-tab opens never fire it (and never trip
// the extension CSP). A session cookie dedupes across tabs and refreshes, and
// no identifier is sent — the counter is just a number.
if (location.hostname === 'app.undistracted.me') {
  try {
    if (!document.cookie.includes('um_visited=1')) {
      document.cookie = 'um_visited=1; path=/; samesite=lax';
      fetch(`${API_BASE_URL}/visits`, { method: 'POST' }).catch(() => {});
    }
  } catch (e) {
    // cookie or fetch blocked — never crash the app
  }
}

// Note: this app runs on Preact — `react`/`react-dom` are aliased to
// `preact/compat` in vite.config.ts. Preact's compat layer renders
// <StrictMode> as a passthrough (no double-invocation of updaters/effects), so
// the wrapper is omitted here to avoid implying a guarantee we don't get.
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

