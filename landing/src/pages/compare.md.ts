import type { APIRoute } from "astro";
import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";
import { alternatives } from "../data/alternatives.js";

/**
 * Markdown alternate of the compare hub, served at /compare.md, so agent
 * crawlers can fetch a clean list of every comparison without parsing HTML.
 */
export const GET: APIRoute = () => {
  const body = [
    `# ${site.name} vs the alternatives`,
    "",
    "Undistracted Me is a free, open-source focus new tab. Here is how it compares to the tools people switch from.",
    "",
    ...alternatives.map(
      (a) =>
        `- [${a.name} alternative](${site.url}/${a.slug}-alternative/): ${a.subline}`,
    ),
  ].join("\n");

  const { markdown, canonicalHref } = renderMarkdownAlternate({
    frontmatter: {
      title: "Compare Undistracted Me vs Every Alternative",
      canonical: `${site.url}/compare/`,
      description:
        "Every Undistracted Me comparison in one place: Momentum, Tabliss, Bonjourr, BlockSite, StayFocusd, Forest, Start.me, Toby, Hamro Patro and Nepali Patro.",
      author: site.author.name,
      tags: ["comparison", "alternative", "browser extension", "focus", "new tab"],
    },
    body,
  });

  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "max-age=300",
      "X-Robots-Tag": "noindex, follow",
      Link: `<${canonicalHref}>; rel="canonical"`,
    },
  });
};
