import type { APIRoute } from "astro";
import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph";
import { site } from "../data/site.js";
import { ours, getAlternative, alternatives } from "../data/alternatives.js";

/**
 * Markdown alternates for the "vs X" comparison pages, served at
 * /<slug>-alternative.md (e.g. /momentum-alternative.md).
 *
 * The homepage (/index.md) and changelog (/changelogs.md) have their own
 * static handlers; this dynamic route covers every comparison page so the
 * auto-emitted <link rel="alternate" type="text/markdown"> resolves to a real
 * file instead of being stripped at build time.
 */
export function getStaticPaths() {
  return alternatives.map((a) => ({
    params: { alternative: `${a.slug}-alternative` },
  }));
}

export const GET: APIRoute = ({ params }) => {
  const slug = (params.alternative ?? "").replace(/-alternative$/, "");
  const alt = getAlternative(slug);

  if (!alt) {
    return new Response("Not found", { status: 404 });
  }

  const rows = [
    ["Price", alt.comparison.price, ours.price],
    ["Account needed", alt.comparison.account, ours.account],
    ["Open source", alt.comparison.openSource, ours.openSource],
    ["Pomodoro", alt.comparison.pomodoro, ours.pomodoro],
    ["Ambient sounds", alt.comparison.ambient, ours.ambient],
    ["Site blocking", alt.comparison.blocking, ours.blocking],
    ["Clip & save", alt.comparison.clipper, ours.clipper],
    ["Task integration", alt.comparison.tasks, ours.tasks],
    ["Widgets", alt.comparison.widgets, ours.widgets],
  ];

  const body = [
    `# ${alt.name} alternative`,
    "",
    alt.subline,
    "",
    ...alt.intro.flatMap((p) => [p, ""]),
    "## How they compare",
    "",
    `| Feature | ${alt.name} | Undistracted Me |`,
    "| --- | --- | --- |",
    ...rows.map(([label, them, us]) => `| ${label} | ${them} | ${us} |`),
    "",
    "## Where they differ",
    "",
    ...alt.differences.flatMap((p) => [p, ""]),
    `## When to choose ${alt.name} instead`,
    "",
    alt.whenToChoose,
    "",
  ].join("\n");

  const { markdown, canonicalHref } = renderMarkdownAlternate({
    frontmatter: {
      title: alt.title,
      canonical: `${site.url}/${slug}-alternative/`,
      description: alt.description,
      author: site.author.name,
      tags: [
        "comparison",
        alt.name.toLowerCase(),
        "browser extension",
        "focus",
        "new tab",
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
