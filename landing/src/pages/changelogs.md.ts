import type { APIRoute } from "astro";
import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";
import { changelog, origin, latestVersion } from "../data/changelog.js";

/**
 * Markdown alternate of the changelog, served at /changelogs.md.
 *
 * Lets AI crawlers and agents read the release history as clean markdown
 * instead of parsing the styled HTML timeline.
 */
export const GET: APIRoute = () => {
  const originMd = [
    `## ${origin.version}: ${origin.title} (${origin.period})`,
    "",
    ...origin.paragraphs,
    "",
    ...origin.milestones.map((m) => `- **${m.label}**: ${m.text}`),
    "",
  ];

  const entriesMd = changelog.flatMap((r) => [
    `## ${r.version}: ${r.title}`,
    "",
    `_Released ${r.released}_`,
    "",
    r.blurb,
    "",
    ...r.highlights.flatMap((h) => [
      h.group ? `### ${h.group}` : "",
      ...h.items.map((it) => `- ${it}`),
      "",
    ]),
  ]);

  const body = [
    "# Changelog",
    "",
    `Latest release: ${latestVersion}.`,
    "",
    "The release history of Undistracted Me: from the first Nepali-calendar new tab in 2020, through the Vue and React rewrites, to the Focus Mode and dashboard rewrite.",
    "",
    ...originMd,
    ...entriesMd,
    "",
    "## Install",
    "",
    `- [Chrome Web Store](${site.chromeUrl})`,
    `- [Firefox Add-ons](${site.firefoxUrl})`,
  ]
    .filter((l) => l !== "")
    .join("\n");

  const { markdown, canonicalHref } = renderMarkdownAlternate({
    frontmatter: {
      title: "Changelog & Release Notes: Undistracted Me",
      canonical: `${site.url}/changelogs/`,
      description:
        "Release history of Undistracted Me: from the first Nepali-calendar new tab in 2020, through the Vue and React rewrites, to the Focus Mode rewrite.",
      author: site.author.name,
      tags: ["changelog", "release notes", "browser extension", "nepali calendar"],
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
