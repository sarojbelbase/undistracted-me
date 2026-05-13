/**
 * Patches dist/ for Firefox compatibility after a Vite/CRXJS build.
 *
 * Background script problem:
 *   CRXJS builds bg.js as an ES module (uses `import` statements).
 *   Firefox requires `background.scripts` (non-module classic scripts) because
 *   `background.service_worker` is behind `extensions.backgroundServiceWorker.enabled`
 *   even in Firefox 128–150 stable builds.
 *
 *   Solution: use esbuild to re-bundle the hashed bg.js + its chunk imports into
 *   a single self-contained IIFE at dist/bg-ff.js, then point `background.scripts`
 *   at that file.  This is ~identical to the source; esbuild just re-links the
 *   chunks and wraps the module graph in a function expression.
 *
 * This script also removes other Chrome-only manifest fields:
 *   - "favicon" permission            (chrome.favicon API, not in Firefox)
 *   - "oauth2" key                    (Chrome identity manifest field)
 *   - "use_dynamic_url"               (Chrome-only web_accessible_resources field)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import esbuild from 'esbuild';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const manifestPath = resolve(distDir, 'manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// 1. Bundle bg.js into a self-contained IIFE so it runs as a classic script.
//    CRXJS splits bg.js into chunks (urls-*.js, notifications-*.js, etc.) which
//    it glues together via ES module imports.  `background.scripts` is a classic
//    non-module context, so those imports would throw a SyntaxError.  esbuild
//    re-bundles all chunks into one file with format:"iife".
if (manifest.background) {
  const assets = readdirSync(resolve(distDir, 'assets'));
  const bgAsset = assets.find(f => f.match(/^bg\.js[^.]*\.js$/));
  if (!bgAsset) throw new Error('Could not find bg.js asset in dist/assets/');

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
  });

  manifest.background = { scripts: ['bg-ff.js'] };
  console.log(`✓ bg-ff.js bundled (IIFE) from assets/${bgAsset}`);
  console.log('✓ background set to scripts: [\'bg-ff.js\']');
}

// 2. Fix author: Firefox requires a string, not an object
if (manifest.author && typeof manifest.author === 'object') {
  manifest.author = manifest.author.email ?? 'Saroj Belbase';
}

// 3. Remove Chrome-only permissions
if (manifest.permissions) {
  manifest.permissions = manifest.permissions.filter(p => p !== 'favicon');
}

// 4. Remove Chrome-only top-level keys
delete manifest.oauth2;

// 5. Remove Chrome-only web_accessible_resources fields
if (manifest.web_accessible_resources) {
  manifest.web_accessible_resources = manifest.web_accessible_resources.map(entry => {
    const { use_dynamic_url, ...rest } = entry;
    return rest;
  });
}

// 6. Ensure Firefox-required fields are present
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
console.log('✓ manifest.json patched for Firefox');
