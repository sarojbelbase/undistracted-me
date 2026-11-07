# Pre-Launch Checklist

> Delete this file once every box below is checked. This is the remaining work
> before `undistracted.me` (landing), `app.undistracted.me` (web app),
> `api.undistracted.me` (backend API), and the extension are fully live on
> Cloudflare with no Vercel dependency.

---

## 🔴 Blocking — OAuth redirect URIs (otherwise web sign-in is broken)

The web app (`app.undistracted.me`) signs in via a popup + PKCE that redirects to
`https://app.undistracted.me/callbacks/auth.html`. Both Google and Spotify must
have this exact URI registered, or the popup errors out.

### 1. Google Cloud Console — ONE "Web application" client
- [ ] Create a **"Web application"** OAuth client (Application type = Web
      application). This single client handles the extension (Chrome, Brave,
      Edge, Opera, Vivaldi, Firefox) AND the website.
- [ ] Set `VITE_GOOGLE_CLIENT_ID` (client) and `GOOGLE_CLIENT_ID` (server) to its
      client ID, and `GOOGLE_CLIENT_SECRET` to its client secret.
- [ ] Under **Authorized redirect URIs**, add ALL of:
      ```
      https://app.undistracted.me/callbacks/auth.html                                     ← website
      http://localhost:3000/callbacks/auth.html                                           ← web dev
      http://localhost:5173/callbacks/auth.html                                           ← web dev
      https://dbmaaolpghdcdcpjmjafjedomcclmbmn.chromiumapp.org/                           ← Chrome/Brave/Edge/Opera/Vivaldi
      https://2e81ac27e122df6c2f53ff217523926ae8d3563f.extensions.allizom.org/            ← Firefox (SHA-1 of the gecko id, not the raw id)
      ```
      (The Chrome/Chromium ID `dbmaaolpghdcdcpjmjafjedomcclmbmn` is pinned via the
      `"key"` field in `public/manifest.json`, so it is stable across machines.)

### 2. Spotify Developer Dashboard
- [ ] Open the Spotify app whose client ID is `VITE_SPOTIFY_CLIENT_ID`
      (https://developer.spotify.com/dashboard).
- [ ] Under **Redirect URIs**, add all three:
      ```
      https://app.undistracted.me/callbacks/auth.html                       ← web mode
      https://dbmaaolpghdcdcpjmjafjedomcclmbmn.chromiumapp.org/            ← Chrome extension (pinned via manifest "key")
      https://2e81ac27e122df6c2f53ff217523926ae8d3563f.extensions.allizom.org/ ← Firefox extension (SHA-1 of the gecko id, not the raw id)
      ```
- [ ] **Note (Spotify Web):** `user-modify-playback-state` (play/pause/skip) is
      **Premium-only**. Free-tier users can connect and see "now playing" but
      cannot control playback. This is a Spotify platform limit, not a bug.
      Consider showing the existing "Spotify Free" tier label (already handled in
      `src/widgets/media/Settings.jsx`).

---

## 🔴 Blocking — GitHub CI/CD secrets (otherwise push-deploys won't run)

Add these to the repo **Settings → Secrets and variables → Actions**
(`github.com/sarojbelbase/undistracted-me`). Values are the same ones used by
Vercel (available from the Vercel env export).

- [ ] `CLOUDFLARE_API_TOKEN` — API token with **Account → Cloudflare Pages → Edit**
      and **Account → Workers Scripts → Edit** (used by `deploy-landing.yml` + `deploy-app.yml`).
- [ ] `VITE_API_KEY`
- [ ] `VITE_SPOTIFY_CLIENT_ID`
- [ ] `VITE_GOOGLE_CLIENT_ID` (used by `build-extension.yml` + `deploy-app.yml`)
- [ ] `VITE_DEBUG_MODE`
- [ ] `VITE_DEBUG_MODE`

Runtime secrets already set on Cloudflare Pages (`undistracted-me-app`):
`API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` ✅ — no action needed.

---

## 🟡 Analytics — Cloudflare Web Analytics

- [ ] Cloudflare dashboard → **Analytics & Logs → Web Analytics → Add a site** →
      enter `undistracted.me`.
- [ ] Copy the beacon token (`data-cf-beacon='{"token":"…"}'`) and wire it into
      `landing/src/layouts/BaseLayout.astro` (replaces the removed Vercel Analytics).
      **Snippet added; the `REPLACE_WITH_YOUR_CF_BEACON_TOKEN` placeholder still needs the real token.**
- [ ] (Optional) Add `app.undistracted.me` as a second Web Analytics site.

---

## 🟢 Cleanup — retire Vercel (after the above are confirmed live)

- [ ] Delete the old **Vercel Blob store** (backgrounds + rain are now on R2 at
      `media.undistracted.me`; the Vercel blob is redundant). `vercel blob rm` or
      delete the store in the Vercel dashboard.
- [x] Delete the old `api/` directory (Vercel serverless functions — replaced by
      `functions/`).
- [x] Delete root `vercel.json` (Vercel config — replaced by `_headers` + `_redirects`).
- [x] Remove `@vercel/analytics` and `@vercel/blob` from `package.json` (no longer used).
- [x] Repoint `scripts/upload-backgrounds.mjs` from `@vercel/blob` to R2
      (`wrangler r2 object put`) so future background uploads go to R2.
- [ ] Delete the Vercel projects `undistracted-me` and `undistracted-me-landing`
      once the Cloudflare domains have been stable for a few days.

---

## 🟢 Polish / nice-to-have (non-blocking)

- [ ] **HSTS** — Cloudflare zone-level HSTS currently overrides `_headers`
      (`max-age=0`). Set a real `max-age` in **SSL/TLS → Edge Certificates →
      HTTP Strict Transport Security**, or disable it there so the `_headers`
      value (`max-age=31536000`) applies.
- [ ] **`www` → apex 301** — `www.undistracted.me` currently serves directly
      (no redirect). For SEO, consider redirecting `www` → `undistracted.me`
      (canonical is already the apex).
- [ ] **Stale unit tests** — ~34 unit tests are failing (pre-existing, not caused
      by this migration). Fix or mark `skip` before shipping.
- [ ] **Google Search Console / re-verify** — the apex now serves directly (no
      307 to `www`), so re-run Google Search Console verification for `undistracted.me`.
