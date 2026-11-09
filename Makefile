# ─────────────────────────────────────────────────────────────────────────────
# Undistracted Me — secret management
#
# Publishes secrets from the gitignored `.env` file to the project's secret
# stores, so local builds, CI (GitHub Actions) and the runtime (Cloudflare
# Pages) all stay in sync.
#
#   make push_secrets      Publish VITE_* build secrets to GitHub Actions
#   make push_cloudflare   Publish runtime secrets to Cloudflare Pages
#   make secrets           Publish both
#
# Requires an authenticated `gh` and `wrangler`.
#
# Note: Cloudflare Pages binds secrets at deploy time, not per-request, so
# after `make push_cloudflare` you must redeploy for the change to take effect
# (e.g. `npx wrangler pages deploy dist --project-name undistracted-me-app`).
# ─────────────────────────────────────────────────────────────────────────────

# `.env` is gitignored and never committed. The leading `-` suppresses the
# error when the file is absent.
-include .env

GH_REPO       ?= sarojbelbase/undistracted-me
PAGES_PROJECT ?= undistracted-me-app
API_PROJECT   ?= undistracted-me-api

.PHONY: push_secrets push_cloudflare secrets build build-chrome build-firefox start-firefox

## Publish VITE_* build secrets to GitHub Actions.
push_secrets:
	@test -n "$(VITE_API_KEY)" || { echo "error: VITE_API_KEY missing from .env"; exit 1; }
	@printf '%s' "$(VITE_API_KEY)" | gh secret set VITE_API_KEY --repo $(GH_REPO)
	@printf '%s' "$(VITE_GOOGLE_CLIENT_ID)" | gh secret set VITE_GOOGLE_CLIENT_ID --repo $(GH_REPO)
	@printf '%s' "$(VITE_SPOTIFY_CLIENT_ID)" | gh secret set VITE_SPOTIFY_CLIENT_ID --repo $(GH_REPO)
	@printf '%s' "$(VITE_CF_BEACON_TOKEN)" | gh secret set VITE_CF_BEACON_TOKEN --repo $(GH_REPO)
	@echo "published GitHub Actions secrets"

## Publish runtime secrets to the API project (Cloudflare Pages Functions).
push_cloudflare:
	@test -n "$(VITE_API_KEY)" || { echo "error: VITE_API_KEY missing from .env"; exit 1; }
	@printf '%s' "$(VITE_API_KEY)" | wrangler pages secret put API_KEY --project-name $(API_PROJECT)
	@printf '%s' "$(VITE_GOOGLE_CLIENT_ID)" | wrangler pages secret put GOOGLE_CLIENT_ID --project-name $(API_PROJECT)
	@printf '%s' "$(GOOGLE_CLIENT_SECRET)" | wrangler pages secret put GOOGLE_CLIENT_SECRET --project-name $(API_PROJECT)
	@echo "published Cloudflare Pages secrets — redeploy to bind them"

## Publish to both GitHub Actions and Cloudflare Pages.
secrets: push_secrets push_cloudflare

# ─────────────────────────────────────────────────────────────────────────────
# Extension builds
#
#   make build           Chrome (unpacked) build → dist/
#   make build-chrome    Chrome Web Store zip    → builds/chrome.zip
#   make build-firefox   Firefox Addons zip      → builds/*.zip (web-ext)
#   make start-firefox   Run the Firefox build locally via web-ext
#
# Chrome and Firefox builds are isolated: Chrome builds to `dist/`, Firefox
# builds to a cloned `dist-firefox/` (patched by scripts/patch-manifest-firefox.mjs)
# so the Chrome `key`/extension-ID is never clobbered.
# ─────────────────────────────────────────────────────────────────────────────

## Build the Chrome (unpacked) extension into dist/.
build:
	bun run build

## Build + zip for the Chrome Web Store.
build-chrome:
	bun run build:chrome

## Build + zip for Firefox Addons (isolated dist-firefox/).
build-firefox:
	bun run build:firefox

## Build and run the Firefox extension locally via web-ext.
start-firefox:
	bun run start:firefox
