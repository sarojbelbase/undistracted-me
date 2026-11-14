# Privacy practices — Chrome Web Store

Paste these into the **Privacy practices** tab of the CWS developer dashboard.
Each justification maps to a section of the live policy at
`https://undistracted.me/pp-and-tos` (source: `landing/public/pp-and-tos.html`).

---

## 1. Single purpose

> Undistracted Me is a distraction-free new tab page. It replaces Chrome's
> default new tab with a calm Focus Mode (a cinematic full-screen clock) and a
> customizable dashboard of widgets — Nepali calendar, weather, to-dos, Pomodoro
> timer, notes, and more — with optional Google (Calendar, Tasks, Contacts, Drive
> sync) and Spotify integrations so everything you need is in one quiet place.

## 2. Permission justifications

**alarms**
> Runs lightweight periodic background tasks in the MV3 service worker (which
> Chrome suspends when idle): a 1-minute tick to keep the clock and Focus Mode
> look-away timer accurate, 15–30 minute refreshes for the stock and RSS widgets,
> and scheduled reminders for Google Calendar events and Pomodoro breaks. Without
> alarms these reminders and refreshes stop whenever Chrome suspends the service
> worker.

**declarativeNetRequest**
> Used only by the optional Website Blocker in Focus Mode. When the user adds a
> distracting site to their block list, the extension creates a dynamic rule that
> redirects that site to the extension's own "blocked" page. Rules are added,
> edited, and removed only for sites the user explicitly blocks in Settings, and
> only while the feature is enabled.

**geolocation**
> Used only by the Weather widget's optional auto-location. Chrome prompts the
> user for permission before any coordinates are read; coordinates are sent
> directly to Open-Meteo (a privacy-respecting weather API) to fetch local weather
> and are never stored or sent to our servers. The user can instead type a city
> name manually.

**host permission use**
> Most host permissions are narrowly scoped to the specific third-party APIs the
> widgets call directly from the extension: Google (Calendar/Tasks/Contacts/Drive
> app-data sync), Spotify (playback), Open-Meteo (weather), Nepali stock sources
> (nepalipaisa.com, merolagani.com), and public IP-geolocation fallbacks
> (ipapi.co, free.freeipapi.com). The two broader entries — *.youtube.com and
> *.soundcloud.com — are for an optional media panel that reads the
> currently-playing track via a content script and forwards it to Focus Mode; that
> script does not modify those pages or transmit data.

**identity**
> Used for the optional Google and Spotify sign-ins via OAuth 2.0
> (chrome.identity.launchWebAuthFlow). It lets the user connect Google
> Calendar/Tasks/Contacts and Spotify so those widgets can show their data.
> Nothing is signed in unless the user chooses it, and tokens are stored locally
> only.

**idle**
> Used by the look-away break reminder to check whether the computer is idle or
> locked (chrome.idle.queryState). If the user is away from the computer, the
> reminder is skipped so it never fires while they are not looking at the screen.

**notifications**
> Used to show optional reminders and break alerts: Google Calendar event
> reminders, Pomodoro timer completion, and look-away break notifications. Each
> type is opt-in and can be turned off in Settings.

**scripting**
> Used to re-inject the media-panel content script into already-open
> YouTube/SoundCloud tabs when the extension is installed, updated, or Chrome
> restarts, so media controls keep working without a page reload. It only injects
> the extension's own script into those two sites.

**storage**
> Used to store widget settings, layout, theme, and OAuth tokens locally on the
> device (chrome.storage.local) so the dashboard configuration persists across
> restarts. This data never leaves the browser except for the specific API calls
> described in the privacy policy.

**tabs**
> Used for two things: (a) checking whether a new-tab page is currently active
> before showing a look-away reminder (so the reminder only appears when the user
> is looking at the dashboard), and (b) routing media playback commands
> (play/pause/next) to the correct YouTube/SoundCloud tab.

**topSites**
> Used by the optional Quick Access widget to show the user's most-visited sites
> as shortcuts. The list is read from Chrome's topSites API and displayed inline
> only — it is never stored, transmitted, or used for any other purpose.

## 3. Data usage

- **Data collected:** local user preferences / widget settings; authentication
  tokens for Google and Spotify (stored locally only).
- **Sold to third parties:** ❌ No
- **Used for targeted advertising / ad targeting:** ❌ No
- **Used for anything unrelated to the extension's core function:** ❌ No
