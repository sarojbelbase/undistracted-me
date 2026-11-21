import type { APIRoute } from "astro";
import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";
import { widgets } from "../data/widgets.js";

/**
 * Markdown alternate of the homepage, served at /index.md.
 *
 * The `markdownAlternate: true` integration option points <Seo> at this via
 * `<link rel="alternate" type="text/markdown">`, so agents can fetch a clean,
 * machine-readable version of the landing page instead of parsing HTML.
 */
export const GET: APIRoute = () => {
  const body = [
    `# ${site.name}`,
    "",
    site.description,
    "",
    "## Install",
    "",
    `- [Chrome Web Store](${site.chromeUrl})`,
    `- [Firefox Add-ons](${site.firefoxUrl})`,
    `- [Web app](${site.webAppUrl})`,
    "",
    "## Widgets",
    "",
    ...widgets.map((w) => `- **${w.title}**: ${w.text ?? ""}`),
    "",
    "## Project",
    "",
    `- [Source code (GitHub)](${site.githubUrl})`,
    `- [Privacy policy & terms](${site.url}${site.privacyUrl})`,
  ].join("\n");

  const { markdown, canonicalHref } = renderMarkdownAlternate({
    frontmatter: {
      title: site.title,
      canonical: `${site.url}/`,
      description: site.description,
      author: site.author.name,
      tags: [
        "browser extension",
        "site blocker",
        "focus mode",
        "new tab",
        "web clipper",
        "pomodoro timer",
        "focus extension",
        "productivity extension",
        "distraction blocker",
        "deep work tool",
        "nepali calendar",
      ],
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
