import { createApiCatalog } from "@jdevalk/astro-seo-graph";
import { site } from "../../data/site.js";

/**
 * RFC 9727 API catalog — lets agent crawlers discover the site's APIs in one
 * fetch. Schema endpoints are auto-typed to their schema.org URLs.
 */
export const GET = createApiCatalog({
  siteUrl: site.url,
  schemaEndpoints: [
    { path: "/schema/page.json", schemaType: "WebPage" },
  ],
  schemaMap: { path: "/schemamap.xml" },
  additional: [
    { anchor: "https://app.undistracted.me", type: "https://schema.org/WebApplication" },
    { anchor: "https://api.undistracted.me", type: "https://schema.org/WebAPI" },
  ],
});
