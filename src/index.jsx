import './themeInit.js'; // must be first — sets data-mode & CSS vars before React renders
import ReactDOM from 'react-dom/client';
import React from 'react';
import App from './App';
import { getPlatform, PLATFORMS } from './constants/env';

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
  beacon.type = 'module';
  beacon.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  beacon.dataset.cfBeacon = JSON.stringify({
    token: import.meta.env.VITE_CF_BEACON_TOKEN,
  });
  document.head.appendChild(beacon);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

