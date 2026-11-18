import type { APIRoute } from "astro";
import { gitLastmod } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";

// Indexable pages, with the source file that produces each, so <lastmod>
// reflects real git history rather than CI checkout timestamps.
const PAGES = [
  { url: `${site.url}/`, file: "src/pages/index.astro" },
  { url: `${site.url}/changelogs/`, file: "src/pages/changelogs/index.astro" },
  { url: `${site.url}/pp-and-tos`, file: "public/pp-and-tos.html" },
  { url: `${site.url}/momentum-alternative/`, file: "src/pages/momentum-alternative.astro" },
  { url: `${site.url}/tabliss-alternative/`, file: "src/pages/tabliss-alternative.astro" },
  { url: `${site.url}/bonjourr-alternative/`, file: "src/pages/bonjourr-alternative.astro" },
  { url: `${site.url}/blocksite-alternative/`, file: "src/pages/blocksite-alternative.astro" },
  { url: `${site.url}/stayfocusd-alternative/`, file: "src/pages/stayfocusd-alternative.astro" },
];

/**
 * Flat XML sitemap at /sitemap.xml — the standard path most crawlers and
 * agent-readiness checkers request. Replaces the @astrojs/sitemap index
 * (/sitemap-index.xml) so the canonical location matches what robots.txt and
 * the Link header advertise.
 */
export const GET: APIRoute = () => {
  const urls = PAGES.map(({ url, file }) => {
    const lastmod = gitLastmod(file);
    const lastmodTag = lastmod
      ? `<lastmod>${lastmod.toISOString()}</lastmod>`
      : "";
    return `<url><loc>${url}</loc>${lastmodTag}</url>`;
  }).join("");

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
