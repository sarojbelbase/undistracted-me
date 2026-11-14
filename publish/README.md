# Publishing — Undistracted Me

Everything needed to publish the extension to the **Chrome Web Store** and
**Firefox AMO**, in one folder: listing copy, privacy disclosures, changelog,
credentials, and store-ready images.

## Folder map

| Path | What it is |
|---|---|
| `LISTING.md` | Store listing copy — name, category, short + detailed description (CWS + AMO) |
| `PRIVACY.md` | Single purpose + permission justifications + data-usage declarations (the "Privacy practices" tab) |
| `CHANGELOG.md` | Version history / release notes |
| `CREDENTIALS.md` | API credentials and CLI publish commands for both stores |
| `chrome/screenshots/` | 5 store-ready screenshots (**1280×800**, 24-bit PNG, no alpha) |
| `chrome/promo/` | Small promo tile (**440×280**) + marquee (**1400×560**) |
| `firefox/screenshots/` | 5 store-ready screenshots (**1280×800**) for AMO |

> Raw source images (`store-assets/`) are gitignored. Only `publish/` is the
> curated, human-maintained set. Store icons (16→512) come automatically from
> the manifest `icons` field (`public/favicon/lotus*.png`) — no separate icon
> upload is needed.

## Current status — v4.0.1

- **Firefox AMO**: published (listed) via CLI. Signed xpi →
  `builds/undistracted_me-4.0.1.xpi`. Listed submissions go through human
  review before going live.
- **Chrome Web Store**: `builds/chrome.zip` rebuilt with the corrected `key`
  (extension ID `dfgbijakkhepoonhaelocdmcleeehmef`). Remaining manual steps:
  1. Upload `builds/chrome.zip` (or run `bun run publish:chrome` once the CWS
     refresh token is regenerated — see `CREDENTIALS.md`).
  2. Fill the **Privacy practices** tab from `PRIVACY.md`.
  3. Upload the screenshots + promo tiles from `chrome/`.

## Publish workflow

```bash
# ── Firefox AMO ──────────────────────────────────────────────
bun run sign:firefox      # build:firefox + sign UNLISTED (self-install)
bun run publish:firefox   # build:firefox + submit LISTED (public, review)

# ── Chrome Web Store ─────────────────────────────────────────
bun run publish:chrome    # build:chrome + upload + publish (needs CWS creds in .env)
```

Both stores read name / summary / description / category / screenshots from
their **developer dashboards** (not from the CLI). The CLI only builds the zip
and uploads the package. `LISTING.md` has the copy for the dashboard fields.

## Where the images go

| Store | Field | File |
|---|---|---|
| Chrome | Screenshot 1–5 | `chrome/screenshots/01…05_*.png` |
| Chrome | Small promo tile | `chrome/promo/small_promo_440x280.png` |
| Chrome | Marquee (optional) | `chrome/promo/marquee_1400x560.png` |
| Firefox | Screenshot 1–5 | `firefox/screenshots/01…05_*.png` |

## Repo facts to keep in mind

- Extension ID (Chrome) `dfgbijakkhepoonhaelocdmcleeehmef` is derived from the
  `key` in `public/manifest.json`. **Do not regenerate or remove that key** or
  the ID changes and the store upload fails with "key doesn't match".
- Extension ID (Firefox) `{1071d037-0f17-4c92-b06c-704050d2e2c3}` is pinned in
  `browser_specific_settings.gecko.id`.
- `.env` holds the secrets (AMO JWT, CWS OAuth). It is gitignored — never commit it.
