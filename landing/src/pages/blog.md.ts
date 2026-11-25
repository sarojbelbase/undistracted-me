import type { APIRoute } from "astro";
import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";
import { blogPosts } from "../data/blog.js";

export const GET: APIRoute = () => {
  const body = [
    `# ${site.name} Blog`,
    "",
    "Guides and comparisons on the Nepali date, the Bikram Sambat calendar, the best Nepali extensions and focus new tabs.",
    "",
    ...blogPosts.map((p) => `- [${p.title}](${site.url}/blog/${p.slug}/)`),
  ].join("\n");

  const { markdown, canonicalHref } = renderMarkdownAlternate({
    frontmatter: {
      title: "The Undistracted Me Blog: Nepali Calendar & Focus",
      canonical: `${site.url}/blog/`,
      description:
        "Guides and comparisons on the Nepali date, the Bikram Sambat calendar, the best Nepali extensions and focus new tabs.",
      author: site.author.name,
      tags: ["blog", "nepali calendar", "nepali extension", "focus"],
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
