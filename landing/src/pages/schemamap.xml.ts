import { createSchemaMap } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";

/**
 * Discovery point for the site's schema.org endpoints. Agent crawlers fetch
 * this to find the site's JSON-LD knowledge graph without parsing HTML.
 */
export const GET = createSchemaMap({
  siteUrl: site.url,
  entries: [
    { path: "/schema/page.json", lastModified: new Date(`${site.lastUpdated}T00:00:00Z`) },
  ],
});
