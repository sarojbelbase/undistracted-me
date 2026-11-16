// Content negotiation for the landing homepage: serve a markdown variant when
// the client asks for it (Accept: text/markdown). Every other request passes
// through to the static asset server (and _redirects/_headers).
//
// The markdown body is fetched from the already-built /index.md asset (Astro
// prerenders it from src/pages/index.md.ts), so this Function stays DRY — the
// negotiated representation is byte-identical to the /index.md alternate.
//
// Deployed from ./functions/index.js — see .github/workflows/deploy-landing.yml
// "Stage Pages Functions" step. The source lives in ./landing/functions-src
// (named to avoid the repo-root .gitignore rule that ignores `functions/`).

export async function onRequest(context) {
  const { request, next, env } = context;
  try {
    if (request.method !== 'GET') return next();

    const url = new URL(request.url);
    if (url.pathname !== '/' && url.pathname !== '/index.html') return next();

    const accept = request.headers.get('Accept') || '';
    if (!accept.toLowerCase().includes('text/markdown')) return next();

    const md = await env.ASSETS.fetch(new URL('/index.md', request.url));
    if (!md.ok) return next();

    return new Response(md.body, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        Vary: 'Accept',
        'Cache-Control': md.headers.get('Cache-Control') || 'public, max-age=300',
      },
    });
  } catch {
    return next();
  }
}
