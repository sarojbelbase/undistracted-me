// Inject the JSON-LD schema graph into the built web-app HTML.
//
// Run AFTER `bun run build` and BEFORE `wrangler pages deploy`. This keeps
// inline JSON-LD out of the shared entries/index.html (where the extension's
// CSP would block it) while still serving it to crawlers on the web app.
//
// Usage: bun scripts/inject-seo.mjs

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { injectSeo, unhideSsrContent } from './seo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = resolve(__dirname, '..', 'dist', 'entries', 'index.html');

if (!existsSync(target)) {
  console.error(
    `inject-seo: ${target} not found: run \`bun run build\` first.`,
  );
  process.exit(1);
}

const html = readFileSync(target, 'utf8');
const out = unhideSsrContent(injectSeo(html));

if (out === html) {
  console.log('inject-seo: nothing to change (JSON-LD + SSR content already ready).');
} else {
  writeFileSync(target, out, 'utf8');
  console.log('inject-seo: injected JSON-LD and unhid SSR content in dist/entries/index.html');
}
