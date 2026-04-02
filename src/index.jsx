import './themeInit.js'; // must be first — sets data-mode & CSS vars before React renders
import ReactDOM from 'react-dom/client';
import React from 'react';
import App from './App';

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

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

