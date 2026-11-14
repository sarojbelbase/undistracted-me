import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import seoGraph from '@jdevalk/astro-seo-graph/integration';
import { gitLastmod } from '@jdevalk/astro-seo-graph';

// Map a public URL back to the source file that produces it, so the sitemap's
// <lastmod> reflects real git history rather than CI file timestamps.
function urlToSourceFile(url) {
  const path = new URL(url).pathname.replace(/\/+$/, '') || '/';
  if (path === '/') return 'src/pages/index.astro';
  if (path === '/pp-and-tos') return 'public/pp-and-tos.html';
  return null;
}

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
      serialize: (item) => {
        const file = urlToSourceFile(item.url);
        if (file) {
          const last = gitLastmod(file);
          if (last) item.lastmod = last.toISOString();
        }
        return item;
      },
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
        filter: (url) => new URL(url).pathname !== '/404',
      },
    }),
  ],
});
