import type { APIRoute } from "astro";
import { site } from "../data/site.js";

export const GET: APIRoute = () => {
  const body = [
    "User-agent: *",
    "Allow: /",
    "",
    `Sitemap: ${site.url}/sitemap-index.xml`,
    "",
    "Content-Signal: ai-train=yes, search=yes, ai-input=yes",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
