<p align="center">
<img src="src/assets/img/logo.svg" width="40%"><br>
<strong>
A chrome/firefox extension that replaces your new tab with a beautiful, distraction-free dashboard featuring nepaliness, focus mode, google integrations and more.
</strong><br>

<span>
<a href="http://hits.dwyl.com/sarojbelbase/undistracted-me"><img src="http://hits.dwyl.com/sarojbelbase/undistracted-me.svg" alt="Total Hits"></a>
<a href="https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef"><img src="https://img.shields.io/chrome-web-store/users/dfgbijakkhepoonhaelocdmcleeehmef?logo=google-chrome&logoColor=white&style=flat-square" alt="Chrome Users"></a>
<a href="https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/"><img src="https://img.shields.io/amo/users/{1071d037-0f17-4c92-b06c-704050d2e2c3}?logo=firefox&logoColor=white&style=flat-square" alt="Firefox Users"></a>
 <a href="https://github.com/sarojbelbase/undistracted-me/releases"><img src="https://img.shields.io/github/v/release/sarojbelbase/undistracted-me?style=flat-square" alt="Releases"></a>
<a href="https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef">
<img alt="Rating On Chrome Web Store" src="https://img.shields.io/chrome-web-store/rating/dfgbijakkhepoonhaelocdmcleeehmef?style=flat-square"></a>
</span>

</p>

## Screenshots

### Canvas mode — the dashboard

Your new tab as a calm, rearrangeable grid: the Nepali calendar and clock up
top, then the widgets you care about — weather, notes, countdown, stocks,
events, occasions, top sites and more — dragged into place exactly how you like.

<p align="center">
  <img src="landing/src/assets/screenshots/canvas_mode.webp" alt="Canvas mode — the Undistracted Me dashboard with its draggable widget grid" width="85%">
</p>

### Focus mode — the cinematic clock

A fullscreen, distraction-free clock: the time set against a quiet background,
with ambient context panels (Pomodoro, upcoming events, stocks, weather, world
clocks) that surface only when you need them.

<p align="center">
  <img src="landing/src/assets/screenshots/focus_mode.webp" alt="Focus mode — the Undistracted Me cinematic fullscreen clock" width="85%">
</p>

## Deployments

- [Chrome Web Store](https://chromewebstore.google.com/detail/undistracted-me/dfgbijakkhepoonhaelocdmcleeehmef)
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/undistracted-me/)
- [Marketing website](https://undistracted.me)
- [Web app](https://app.undistracted.me)

## Feedback

- 🐛 [Report a bug](https://forms.gle/7vf4VGrB9Loz8hB76)
- 💡 [Suggest a feature](https://forms.gle/7vf4VGrB9Loz8hB76)

Both forms are the owner's Google Forms and are reviewed periodically.

## Tech Stack

- **React 19** + **Vite v8** + **@crxjs/vite-plugin** (Manifest V3)
- **Tailwind CSS v4** for styling
- **Zustand** for state management
- **Bun** as package manager and runtime

## Google OAuth Scopes

The app requests the following Google OAuth scopes when you connect your Google account:

| Scope | Purpose |
|---|---|
| `userinfo.profile` | Display your name and avatar in the Settings panel |
| `userinfo.email` | Display your email in the Settings panel |
| `calendar.readonly` | Sync and display upcoming events from Google Calendar in the Upcoming Events widget |
| `contacts.readonly` | Read birthdays and anniversaries from Google Contacts for the Occasions widget |
| `tasks` | Add, complete, and manage Google Tasks from the Tasks panel in Focus Mode |

## Build Setup

```bash
# install dependencies
bun install

# start dev server
bun run dev

# build for production (outputs to dist/)
bun run build
```

### Chrome

```bash
# build and zip for Chrome Web Store
bun run build:chrome
```

This outputs a `chrome.zip` inside the `builds/` folder, ready to upload to the Chrome Web Store.

**Load unpacked for local testing:**

1. Run `bun run build`
2. Open `chrome://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the `dist/` folder

> ⚠️ Load the `dist/` folder (not `dist-firefox/`). `dist/` is the Chrome build with
> the pinned extension ID; `dist-firefox/` is Firefox-only and has the `key`
> removed (a different ID, and Google/Spotify OAuth won't work).

### Firefox

```bash
# build for Firefox Addons (patches an isolated dist-firefox/ copy)
bun run build:firefox

# run locally with web-ext
bun run start:firefox
```

This outputs a `.zip` inside the `builds/` folder via `web-ext`, ready to upload to Firefox Addons.

> `build:firefox` clones `dist/` → `dist-firefox/` and patches *that* copy
> (via `scripts/patch-manifest-firefox.mjs`), so `dist/` always stays a clean
> Chrome build. Running a Firefox build no longer clobbers your Chrome
> `Load unpacked` extension ID.

## Testing

```bash
# E2E tests (Playwright)
bun run test

# Unit tests (Vitest)
bun run test:unit

# Unit tests with coverage
bun run test:unit:coverage
```

## Known Issues

See [`.docs/KNOWN_ISSUES.md`](.docs/KNOWN_ISSUES.md) for browser-level rendering
quirks (e.g. glass-mode flicker on resize) and their root causes.

## License

MIT

#### Made with React in Nepal.
