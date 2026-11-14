# Publish credentials & CLI commands

Secrets live in `.env` (gitignored). The table below lists the **variable
names** and where each value comes from — never commit real secrets here.

`.env` reference (see also `.env.example`):

```
# Firefox AMO (addons.mozilla.org)
AMO_JWT_ISSUER=user:xxxxxxxx:xxx
AMO_JWT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Chrome Web Store
CWS_CLIENT_ID=xxxxxxxxxxxx.apps.googleusercontent.com
CWS_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
CWS_REFRESH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
CWS_EXTENSION_ID=dfgbijakkhepoonhaelocdmcleeehmef
CWS_PUBLISHER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

---

## Firefox AMO

AMO uses an **API key** (JWT issuer + secret) from
https://addons.mozilla.org/developers/addon/api/key/.

```bash
bun run sign:firefox      # build:firefox + sign UNLISTED (self-install)
bun run publish:firefox   # build:firefox + submit LISTED (public review queue)
```

- `sign:firefox` → `web-ext sign` with `--channel=unlisted`.
- `publish:firefox` → `web-ext sign` with `--channel=listed`.
- Output xpi lands in `builds/undistracted_me-<version>.xpi`.

## Chrome Web Store

CWS uses **Google OAuth** (client ID/secret + refresh token) via
`chrome-webstore-upload` (v6). Five values, one-time setup unless the refresh
token is revoked.

| Var | What it is | Where to get it |
|---|---|---|
| `CWS_CLIENT_ID` | OAuth client ID | Google Cloud Console |
| `CWS_CLIENT_SECRET` | OAuth client secret | Google Cloud Console |
| `CWS_REFRESH_TOKEN` | Long-lived token | OAuth flow (see below) |
| `CWS_EXTENSION_ID` | 32-char extension ID | CWS dashboard URL |
| `CWS_PUBLISHER_ID` | **Publisher account** ID (not the extension ID) | CWS dev console URL |

```bash
bun run publish:chrome    # build:chrome + upload + publish
```

### Generating CWS credentials (one-time)

1. **IDs** — from https://chrome.google.com/webstore/devconsole/ :
   - `CWS_EXTENSION_ID` = last 32-char segment of the item's store URL
     (`…/detail/undistracted-me/<ID>`).
   - `CWS_PUBLISHER_ID` = the ID in the dev console's own URL
     (`…/devconsole/<PUBLISHER_ID>`), also under **Account** settings.

2. **OAuth client** — https://console.cloud.google.com/ (same Google account that
   owns the listing):
   - Enable the **Chrome Web Store API**.
   - Create an **OAuth client ID** (application type **Web application**).
   - Authorized redirect URIs: add both
     `https://developers.google.com/oauthplayground` **and**
     `http://localhost:8080`.
   - Copy Client ID → `CWS_CLIENT_ID`, Client secret → `CWS_CLIENT_SECRET`.

3. **Refresh token** — two options:

   **A. Loopback script (recommended, binds token to your client):**
   ```bash
   bun scripts/cws-get-refresh-token.mjs
   ```
   Opens the browser, you sign in + authorize scope
   `https://www.googleapis.com/auth/chromewebstore`, and it writes the refresh
   token into `.env`. Requires `http://localhost:8080` as an authorized redirect
   URI (step 2 above).

   **B. OAuth 2.0 Playground** (https://developers.google.com/oauthplayground):
   gear → check **"Use your own OAuth credentials"** → paste client ID/secret →
   scope `https://www.googleapis.com/auth/chromewebstore` → authorize →
   exchange → copy the **refresh token**.

   > ⚠️ If the Playground flow is used **without** "Use your own OAuth
   > credentials" checked, the token is bound to Google's demo client and
   > `publish:chrome` fails with `unauthorized_client`. Use option A to avoid it.

### Troubleshooting

- `publish:chrome` → `unauthorized_client`: refresh token isn't bound to your
  client ID. Regenerate via option A.
- Permission error on publish: confirm the **Chrome Web Store API** is enabled
  on the Cloud project.

---

## Extension ID & OAuth redirect URIs

The Chrome extension ID is **`dfgbijakkhepoonhaelocdmcleeehmef`**, derived from
the `key` field in `public/manifest.json` (SHA-256 of the DER public key → first
16 bytes → each nibble mapped to `a`–`p`). **Never regenerate or remove that
key** — the store upload fails with "key field value in the manifest doesn't
match the current item."

Spotify and Google auth both call `chrome.identity.getRedirectURL()` at runtime
(`app/widgets/media/utils.js`, `app/utilities/googleAuth.js`), which returns
`https://<extension-id>.chromiumapp.org/`. For Chrome that is:

```
https://dfgbijakkhepoonhaelocdmcleeehmef.chromiumapp.org/
```

### Post key-change checklist

If the extension ID ever changes, the ID is baked into the OAuth redirect URIs —
update these dashboards or sign-in breaks:

| Service | Action |
|---|---|
| **Chrome Web Store** | Nothing — the ID *is* the store item. Re-upload the rebuilt zip only. |
| **Spotify Developer Dashboard** | Set redirect URI to `https://dfgbijakkhepoonhaelocdmcleeehmef.chromiumapp.org/` |
| **Google Cloud OAuth client** | Add `https://dfgbijakkhepoonhaelocdmcleeehmef.chromiumapp.org/` to authorized redirect URIs |

- The backend (`api/auth/google/token.js:32`) validates redirect URIs with a
  wildcard pattern (`…chromiumapp.org` / `…extensions.allizom.org`), so no
  server-side change is needed.
- Firefox uses a **separate** ID — `{1071d037-0f17-4c92-b06c-704050d2e2c3}`
  hashed to `https://<sha1>.extensions.allizom.org/` — registered separately in
  Spotify/Google and unaffected by a Chrome key change.

---

## CI (optional)

The build workflow (`.github/workflows/build-extension.yml`) builds both zips on
`v*` tags but does **not** upload to stores. To publish from CI, add the `.env`
values as GitHub Actions secrets and call the scripts.
