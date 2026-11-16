import { defineConfig } from 'astro/config';
import seoGraph from '@jdevalk/astro-seo-graph/integration';
import { llmsSections } from './src/data/llms.js';

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
      llmsTxt: {
        title: 'Undistracted Me',
        siteUrl: 'https://undistracted.me',
        summary: 'Undistracted Me replaces your new tab with a calm, distraction-free dashboard. Free, open source, made in Nepal.',
        sections: llmsSections,
      },
    }),
  ],
});
