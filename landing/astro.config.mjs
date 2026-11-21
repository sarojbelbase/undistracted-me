import { defineConfig } from 'astro/config';
import seoGraph, { indexNowOnBranch } from '@jdevalk/astro-seo-graph/integration';
import { llmsSections } from './src/data/llms.js';
import { INDEXNOW_KEY } from './src/data/indexnow.js';

// https://astro.build/config
export default defineConfig({
  site: 'https://undistracted.me',
  trailingSlash: 'ignore',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    seoGraph({
      validateH1: true,
      validateUniqueMetadata: true,
      validateImageAlt: true,
      validateMetadataLength: {
        // The title and meta description are longer than the library defaults
        // on purpose (they pack in the key features); keep them SERP-friendly
        // but allow the intended length.
        title: { min: 30, max: 70 },
        description: { min: 70, max: 210 },
      },
      validateInternalLinks: {
        skip: (href) => href.startsWith('/api/') || href.startsWith('https://app.undistracted.me') || href.startsWith('https://api.undistracted.me') || href.startsWith('/llms.txt'),
      },
      // Emit <link rel="alternate" type="text/markdown"> on Astro pages and
      // keep it when the matching .md file exists on disk (see src/pages/index.md.ts).
      markdownAlternate: true,
      // Submit built URLs to IndexNow so participating search engines recrawl
      // promptly. Gated to the main branch so preview builds never submit.
      indexNow: indexNowOnBranch(process.env.GITHUB_REF_NAME ?? '', {
        key: INDEXNOW_KEY,
        host: 'undistracted.me',
        siteUrl: 'https://undistracted.me',
        // Canonical lowercase endpoint (the library default capitalizes the
        // path); both are documented, lowercase is what indexnow.org uses.
        endpoint: 'https://api.indexnow.org/indexnow',
        incremental: true,
      }),
      llmsTxt: {
        title: 'Undistracted Me',
        siteUrl: 'https://undistracted.me',
        summary: 'Undistracted Me replaces your new tab with a calm, distraction-free dashboard. Free, open source, made in Nepal.',
        sections: llmsSections,
      },
    }),
  ],
});
