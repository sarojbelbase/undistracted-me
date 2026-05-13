/**
 * Patches dist/ for Firefox compatibility after a Vite/CRXJS build.
 *
 * CRXJS 2.x outputs `background.scripts` pointing at the hashed bg.js bundle.
 * That bundle uses ES module `import` syntax — which is INVALID in a non-module
 * background context.  Firefox 128+ supports module-type service workers, so
 * the correct fix is to switch to:
 *
 *   { "service_worker": "service-worker-loader.js", "type": "module" }
 *
 * CRXJS always emits service-worker-loader.js as a stable (non-hashed) module
 * entry that simply does `import './assets/bg.js-<hash>.js'`. Using it as a
 * module service worker lets Firefox load the ES-module bundle correctly.
 *
 * This script also removes other Chrome-only manifest fields:
 *   - "favicon" permission            (chrome.favicon API, not in Firefox)
 *   - "oauth2" key                    (Chrome identity manifest field)
 *   - "use_dynamic_url"               (Chrome-only web_accessible_resources field)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const manifestPath = resolve(distDir, 'manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// 1. Fix background: Firefox 128+ supports module-type service workers.
//    CRXJS outputs background.scripts with the hashed ES-module bundle, which
//    Firefox rejects because background.scripts is a non-module context.
//    Instead, point to service-worker-loader.js (stable, non-hashed) as a
//    module service worker — this is what Firefox 128+ expects.
if (manifest.background) {
  const loaderPath = resolve(distDir, 'service-worker-loader.js');
  if (!existsSync(loaderPath)) throw new Error('service-worker-loader.js not found in dist/');
  manifest.background = { service_worker: 'service-worker-loader.js', type: 'module' };
  console.log('✓ background set to module service worker: service-worker-loader.js');
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

// 6. Fix browser_specific_settings: empty required[] fails Firefox schema validation
if (manifest.browser_specific_settings?.gecko?.data_collection_permissions) {
  const dcp = manifest.browser_specific_settings.gecko.data_collection_permissions;
  if (Array.isArray(dcp.required) && dcp.required.length === 0) {
    delete dcp.required;
  }
  if (Array.isArray(dcp.optional) && dcp.optional.length === 0) {
    delete dcp.optional;
  }
  // If both were removed, remove the whole data_collection_permissions object
  if (Object.keys(dcp).length === 0) {
    delete manifest.browser_specific_settings.gecko.data_collection_permissions;
  }
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log('✓ manifest.json patched for Firefox');
