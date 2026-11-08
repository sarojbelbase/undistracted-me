import type { APIRoute } from "astro";
import { site } from "../data/site.js";

export const GET: APIRoute = () => {
  // Only standard (RFC 9309 + `Sitemap`) directives. Non-standard directives
  // (`Schemamap:`, `Content-Signal:`, `Agentmap:`, …) are reported as
  // "Unknown directive" by validators and can trip up strict crawlers, so the
  // schema map is advertised via the `Link` header and the API catalog instead.
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${site.url}/sitemap-index.xml`,
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
