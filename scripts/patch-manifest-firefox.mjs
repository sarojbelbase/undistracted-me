/**
 * Patches dist/ for Firefox compatibility after a Vite/CRXJS build.
 *
 * CRXJS generates a service-worker-loader.js that uses ES module `import`
 * syntax and sets `"type": "module"` in the manifest background field.
 * Firefox MV3 does NOT support module-type service workers — this is the
 * primary cause of "addon seems corrupt" errors.
 *
 * This script also removes other Chrome-only manifest fields:
 *   - "type": "module" on background  (Firefox rejects module SWs)
 *   - "favicon" permission            (chrome.favicon API, not in Firefox)
 *   - "oauth2" key                    (Chrome identity manifest field)
 *   - "use_dynamic_url"               (Chrome-only web_accessible_resources field)
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = resolve(__dirname, '../dist');
const manifestPath = resolve(distDir, 'manifest.json');

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

// 1. Fix background: Firefox prefers background.scripts over background.service_worker.
//    Find the actual hashed bg.js asset and point directly to it.
if (manifest.background) {
  const assets = readdirSync(resolve(distDir, 'assets'));
  const bgAsset = assets.find(f => f.startsWith('bg.js') && f.endsWith('.js'));
  if (!bgAsset) throw new Error('Could not find bg.js asset in dist/assets/');

  manifest.background = { scripts: [`assets/${bgAsset}`] };
  console.log(`✓ background switched to scripts: ['assets/${bgAsset}']`);
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
