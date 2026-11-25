import type { APIRoute } from "astro";
import { renderMarkdownAlternate } from "@jdevalk/astro-seo-graph";
import { site } from "../../data/site.js";
import { blogPosts, getPost } from "../../data/blog.js";

export function getStaticPaths() {
  return blogPosts.map((post) => ({ params: { slug: post.slug } }));
}

export const GET: APIRoute = ({ params }) => {
  const post = getPost(params.slug);
  if (!post) return new Response("Not found", { status: 404 });

  const body = [
    `# ${post.title}`,
    "",
    post.description,
    "",
    ...post.content.map((block) => {
      if (block.h) return `## ${block.h}\n`;
      if (block.p) return `${block.p}\n`;
      if (block.ul) return `${block.ul.map((li) => `- ${li}`).join("\n")}\n`;
      if (block.cta) {
        return [
          "## Try Undistracted Me",
          "",
          "Free and open source, no account and no ads. See today's Nepali date on your new tab alongside a site blocker, a Pomodoro timer, ambient sounds and quiet widgets.",
          "",
          `- [Add to Chrome](${site.chromeUrl})`,
          `- [Get it for Firefox](${site.firefoxUrl})`,
          "",
        ].join("\n");
      }
      return "";
    }),
  ].join("\n");

  const { markdown, canonicalHref } = renderMarkdownAlternate({
    frontmatter: {
      title: post.title,
      canonical: `${site.url}/blog/${post.slug}/`,
      description: post.description,
      author: site.author.name,
      tags: post.tags,
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
