// Generate the web app's agent-readiness files into dist/ after the build.
//
// Mirrors what the landing site exposes via @jdevalk/astro-seo-graph, so
// app.undistracted.me reaches parity for AI crawlers: a schema endpoint,
// schema map, RFC 9727 API catalog, ARD (Agentic Resource Description) and a
// markdown alternate. Run AFTER `bun run build` and BEFORE `wrangler pages
// deploy`.
//
// Usage: bun scripts/build-agent-files.mjs

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_SEO, buildSchemaGraph } from './seo.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dist = resolve(__dirname, '..', 'dist');

if (!existsSync(join(dist, 'entries', 'index.html'))) {
  console.error(
    'build-agent-files: dist/entries/index.html not found: run `bun run build` first.',
  );
  process.exit(1);
}

const BASE = APP_SEO.url; // https://app.undistracted.me
const LANDING = 'https://undistracted.me';

function write(relPath, content) {
  const target = join(dist, relPath);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content, 'utf8');
  console.log(`build-agent-files: wrote ${relPath}`);
}

// 1. Schema endpoint: the full JSON-LD knowledge graph (same graph the page
//    inlines, so the endpoint and the page always agree).
write(
  'schema/page.json',
  `${JSON.stringify(buildSchemaGraph(), null, 2)}\n`,
);

// 2. Schema map: discovery point for the schema endpoint.
write(
  'schemamap.xml',
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url contentType="structuredData/schema.org">',
    `    <loc>${BASE}/schema/page.json</loc>`,
    `    <lastmod>${APP_SEO.lastModified}</lastmod>`,
    '  </url>',
    '</urlset>',
    '',
  ].join('\n'),
);

// 3. API catalog (RFC 9727 linkset).
write(
  '.well-known/api-catalog',
  `${JSON.stringify(
    {
      linkset: [
        {
          anchor: `${BASE}/schema/page.json`,
          type: [{ href: 'https://schema.org/WebApplication' }],
        },
        { anchor: `${BASE}/schemamap.xml` },
        { anchor: BASE, type: [{ href: 'https://schema.org/WebApplication' }] },
        {
          anchor: 'https://api.undistracted.me',
          type: [{ href: 'https://schema.org/WebAPI' }],
        },
      ],
    },
    null,
    2,
  )}\n`,
);

// 4. ARD (Agentic Resource Description) with the queries the app answers. The
//    Nepali date queries are the product's own search intent, so they belong
//    here (a machine agent file, not visible body copy).
write(
  '.well-known/ard.json',
  `${JSON.stringify(
    {
      entries: [
        {
          identifier: 'urn:air:undistracted.me:webapp',
          displayName: 'Undistracted Me Dashboard',
          type: 'text/html',
          url: BASE,
          description:
            'The Undistracted Me web app: a focus new-tab dashboard with a Nepali (Bikram Sambat) calendar, site blocker, Pomodoro timer, ambient sounds, Google Tasks and quiet widgets. No account, works offline.',
          representativeQueries: [
            'what is the Nepali date today',
            'aaja kati gate',
            'best focus new tab dashboard',
            'free website blocker with a Pomodoro timer',
            'block distracting sites',
          ],
        },
      ],
    },
    null,
    2,
  )}\n`,
);

// 5. Markdown alternate for AI agents (served at /index.md, noindex).
const md = [
  '# Undistracted Me',
  '',
  APP_SEO.description,
  '',
  '## What it does',
  '',
  '- Nepali date today: the Bikram Sambat date and a monthly calendar, shown alongside the Gregorian date (aaja kati gate).',
  '- Site blocking: block distracting sites for a set timer or always, with a calm countdown.',
  '- Focus Mode: a fullscreen Pomodoro timer with ambient rain and white noise.',
  '- Widgets: calendar, notes, weather, NEPSE stocks, countdown, events, media and more.',
  '',
  '## Install',
  '',
  `- [Chrome Web Store](${APP_SEO.chromeUrl})`,
  `- [Firefox Add-ons](${APP_SEO.firefoxUrl})`,
  `- [Landing site](${LANDING})`,
  '',
  '## Source',
  '',
  `- [GitHub](${APP_SEO.githubUrl})`,
  '',
].join('\n');
write('index.md', md);

// 6. llms-full.txt: the full-content variant (same markdown as /index.md for a
//    single-page app).
write('llms-full.txt', md);
