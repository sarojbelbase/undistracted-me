// Content negotiation for the web-app homepage: serve a markdown variant when
// the client asks for it (Accept: text/markdown). Every other request passes
// through to the static asset server (and _redirects).
//
// Deployed from ./functions/index.js — see .github/workflows/deploy-app.yml
// "Stage Pages Functions" step. The source lives in ./app-functions.

const MARKDOWN = `# Undistracted Me

> A free, open-source new tab for Chrome and Firefox — a calm, distraction-free dashboard with a Nepali calendar, a cinematic Focus Mode, and 30+ quiet widgets. No account, works offline.

## What is Undistracted Me?

Undistracted Me replaces the noisy default new tab with a quiet dashboard designed for deep, focused work. Instead of shortcuts, news feeds, and clutter, you get a clean surface you control.

## Features

- **Focus Mode** — a full-screen, cinematic clock with ambient backgrounds.
- **Dashboard widgets** — a draggable grid of 30+ widgets: weather, air quality, Nepali stock indices, currency and gold rates, RSS feeds, notes, tasks, and a Pomodoro timer.
- **Nepali calendar** — Bikram Sambat and Gregorian dates, today's tithi and events, and public holidays, computed offline.

## Install

- [Chrome Web Store](https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/)

## Links

- [Web app](https://app.undistracted.me/)
- [Landing site](https://undistracted.me)
- [Source on GitHub](https://github.com/sarojbelbase/undistracted-me)
`;

export async function onRequest(context) {
  try {
    const { request, next } = context;
    if (request.method !== 'GET') return next();

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/index.html') return next();

    const accept = request.headers.get('Accept') || '';
    if (!accept.toLowerCase().includes('text/markdown')) return next();

    return new Response(MARKDOWN, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        Vary: 'Accept',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch {
    return context.next();
  }
}
