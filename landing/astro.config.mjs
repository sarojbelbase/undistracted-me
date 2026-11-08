import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import seoGraph from '@jdevalk/astro-seo-graph/integration';

// https://astro.build/config
export default defineConfig({
  site: 'https://undistracted.me',
  trailingSlash: 'ignore',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      // `public/pp-and-tos.html` is a static file, not an Astro route, so it
      // isn't picked up automatically — list it explicitly.
      customPages: ["https://undistracted.me/pp-and-tos"],
    }),
    seoGraph({
      validateH1: true,
      validateUniqueMetadata: true,
      validateImageAlt: true,
      validateMetadataLength: true,
      validateInternalLinks: {
        skip: (href) => href.startsWith('/api/') || href.startsWith('https://app.undistracted.me') || href.startsWith('https://api.undistracted.me'),
      },
      llmsTxt: {
        title: 'Undistracted Me',
        siteUrl: 'https://undistracted.me',
        summary: 'Undistracted Me replaces your new tab with a calm, distraction-free dashboard. Free, open source, made in Nepal.',
      },
    }),
  ],
});
