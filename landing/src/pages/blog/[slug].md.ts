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
    ...post.content.flatMap((block) => {
      const out = [];
      if (block.h) out.push(`## ${block.h}`);
      if (block.p) out.push(block.p);
      if (block.ul) out.push(...block.ul.map((li) => `- ${li}`));
      if (block.cta) {
        out.push(
          "## Try Undistracted Me",
          "",
          "Free and open source, no account and no ads. See today's Nepali date on your new tab alongside a site blocker, a Pomodoro timer, ambient sounds and quiet widgets.",
          "",
          `- [Add to Chrome](${site.chromeUrl})`,
          `- [Get it for Firefox](${site.firefoxUrl})`,
        );
      }
      out.push("");
      return out;
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
