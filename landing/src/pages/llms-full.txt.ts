import type { APIRoute } from "astro";
import { site } from "../data/site.js";
import { faq } from "../data/faq.js";
import { widgets } from "../data/widgets.js";
import { alternatives } from "../data/alternatives.js";

/**
 * llms-full.txt: the full, machine-readable content of the site in one fetch
 * (the llms.txt spec's full-content variant). Gives AI crawlers the FAQ, widget
 * list and every comparison without parsing HTML or following links.
 */
export const GET: APIRoute = () => {
  const body = [
    `# ${site.name}`,
    "",
    site.description,
    "",
    "## What it is",
    "",
    "Undistracted Me replaces the noisy default new tab with a quiet dashboard designed for deep work: a site blocker, Pomodoro timer, ambient sounds, Google Tasks and a grid of quiet widgets. No account, works offline.",
    "",
    "## FAQ",
    "",
    ...faq
      .map(({ q, a }) => [`### ${q}`, "", a.replace(/<[^>]*>/g, ""), ""])
      .flat(),
    "## Widgets",
    "",
    ...widgets.map((w) => `- **${w.title}**: ${w.text ?? ""}`),
    "",
    "## Comparisons",
    "",
    ...alternatives
      .map((a) => [
        `### ${a.name} alternative`,
        "",
        a.subline,
        "",
        ...a.intro,
        "",
        ...a.differences,
        "",
        a.whenToChoose,
        "",
        `Read more: ${site.url}/${a.slug}-alternative/`,
        "",
      ])
      .flat(),
    "## Install",
    "",
    `- [Chrome Web Store](${site.chromeUrl})`,
    `- [Firefox Add-ons](${site.firefoxUrl})`,
    `- [Web app](${site.webAppUrl})`,
    "",
    "## Source",
    "",
    `- [GitHub](${site.githubUrl})`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "max-age=300",
      "X-Robots-Tag": "noindex, follow",
    },
  });
};
