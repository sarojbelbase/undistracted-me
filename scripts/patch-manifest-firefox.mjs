/**
 * Builds a Firefox-compatible extension into an isolated `dist-firefox/` folder.
 *
 * IMPORTANT: this does NOT patch `dist/` in place. It clones `dist/` (the
 * Chrome build) into `dist-firefox/` and patches the clone, so `dist/` stays
 * Chrome-clean. Patching `dist/` in place used to delete the `key` field,
 * which changed the extension ID when the user later "Load unpacked" the same
 * folder into Chrome and silently broke Google/Spotify OAuth (the redirect URI
 * is pinned to the `key`-derived ID).
 *
 * Background script problem:
 *   CRXJS builds bg.js as an ES module (uses `import` statements).
 *   Firefox requires `background.scripts` (non-module classic scripts) because
 *   `background.service_worker` is behind `extensions.backgroundServiceWorker.enabled`
 *   even in Firefox 128–150 stable builds.
 *
 *   Solution: use esbuild to re-bundle the hashed bg.js + its chunk imports into
 *   a single self-contained IIFE at dist-firefox/bg-ff.js, then point
 *   `background.scripts` at that file. This is ~identical to the source;
 *   esbuild just re-links the chunks and wraps the module graph in a function
 *   expression.
 *
 * This script also removes other Chrome-only manifest fields from the clone:
 *   - "key"                          (Chrome extension-ID pin; Firefox derives
 *                                     its ID from browser_specific_settings.gecko.id)
 *   - "favicon" permission           (chrome.favicon API, not in Firefox)
 *   - "oauth2" key                   (Chrome identity manifest field)
 *   - "use_dynamic_url"              (Chrome-only web_accessible_resources field)
 */

import { readFileSync, writeFileSync, readdirSync, cpSync, rmSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, '..');
const srcDir = resolve(rootDir, 'dist');           // Chrome build — kept pristine
const distDir = resolve(rootDir, 'dist-firefox');  // Firefox build — isolated clone
const manifestPath = resolve(distDir, 'manifest.json');

// 0. Verify the Chrome build exists first.
if (!existsSync(resolve(srcDir, 'manifest.json'))) {
  throw new Error('dist/manifest.json not found — run `vite build` first.');
}

// 1. Clone the Chrome build into an isolated Firefox directory.
rmSync(distDir, { recursive: true, force: true });
cpSync(srcDir, distDir, { recursive: true });

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// 2. Bundle bg.js into a self-contained IIFE so it runs as a classic script.
//    CRXJS splits bg.js into chunks (urls-*.js, notifications-*.js, etc.) which
//    it glues together via ES module imports.  `background.scripts` is a classic
//    non-module context, so those imports would throw a SyntaxError.  esbuild
//    re-bundles all chunks into one file with format:"iife".
if (manifest.background) {
  const assets = readdirSync(resolve(distDir, 'assets'));
  const bgAsset = assets.find((f) => f.match(/^bg\.js[^.]*\.js$/));
  if (!bgAsset) throw new Error('Could not find bg.js asset in dist-firefox/assets/');

  esbuild.buildSync({
    entryPoints: [resolve(distDir, 'assets', bgAsset)],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    outfile: resolve(distDir, 'bg-ff.js'),
    // Already minified by Vite; skip double-minification to keep the patch fast.
    minify: false,
    // Target modern Firefox (matching the main build target).
    target: 'firefox128',
    // Vite injects a module-preload helper (preload-helper-*.js) into bg.js
    // because it has a dynamic import. That helper uses `import.meta.url` and
    // `import.meta.resolve`, which are empty in IIFE format. Rewrite them so
    // the helper resolves dep URLs against the background page instead of
    // throwing `Invalid URL` at runtime (and so esbuild stops emitting the
    // `empty-import-meta` warnings).
    define: {
      'import.meta.url': 'self.location.href',
      'import.meta.resolve': 'undefined',
    },
  });

  manifest.background = { scripts: ['bg-ff.js'] };
  console.log(`✓ bg-ff.js bundled (IIFE) from assets/${bgAsset}`);
  console.log("✓ background set to scripts: ['bg-ff.js']");
}

// 3. Fix author: Firefox requires a string, not an object
if (manifest.author && typeof manifest.author === 'object') {
  manifest.author = manifest.author.email ?? 'Saroj Belbase';
}

// 4. Remove Chrome-only permissions
if (manifest.permissions) {
  manifest.permissions = manifest.permissions.filter((p) => p !== 'favicon');
}

// 5. Remove Chrome-only top-level keys
delete manifest.oauth2;
delete manifest.key; // Chrome-only extension ID pin; Firefox derives its ID from gecko.id

// 6. Remove Chrome-only web_accessible_resources fields
if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources = manifest.web_accessible_resources.map((entry) => {
    const { use_dynamic_url, ...rest } = entry;
    return rest;
  });
}

// 7. Ensure Firefox-required fields are present (carried over from the source
//    manifest, but kept here defensively in case it changes).
if (!manifest.browser_specific_settings) {
  manifest.browser_specific_settings = {};
}
if (!manifest.browser_specific_settings.gecko) {
  manifest.browser_specific_settings.gecko = {};
}
// Note: data_collection_permissions is only supported in Firefox 140+.
// With strict_min_version: 128.0, we omit it to avoid validation errors.
// Future: when minimum version is raised to 140+, add this field.

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ manifest.json patched for Firefox (dist-firefox/)');
console.log('✓ dist/ left untouched (Chrome build preserved)');
