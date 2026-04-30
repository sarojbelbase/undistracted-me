import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { crx } from "@crxjs/vite-plugin";
import manifest from "./public/manifest.json";
import { obscureEnvKeys } from "./plugins/obscureEnvKeys";

/**
 * Dev-only: intercepts GET /api/favicon?domain=...&sz=... and does a
 * server-side waterfall (Google → DuckDuckGo → Icon Horse) so the browser
 * never sees individual-service 404s in the console.
 */
const faviconWaterfall = (): Plugin => ({
  name: "favicon-waterfall",
  configureServer(server) {
    server.middlewares.use("/api/favicon", async (req, res, next) => {
      if (req.method !== "GET") return next();
      const qs = (req.url ?? "").split("?")[1] ?? "";
      const params = new URLSearchParams(qs);
      const domain = params.get("domain") ?? "";
      const sz = params.get("sz") ?? "64";
      if (!domain) {
        res.statusCode = 400;
        res.end();
        return;
      }
      // Don't proxy private/local hostnames to external favicon services
      if (
        /^localhost$|^\.local$|\.internal$|^127\.|^192\.168\.|^10\.|^\[?::1\]?$/.test(
          domain,
        )
      ) {
        res.statusCode = 204;
        res.end();
        return;
      }

      const services = [
        `https://www.google.com/s2/favicons?domain=${domain}&sz=${sz}`,
        `https://icons.duckduckgo.com/ip3/${domain}.ico`,
        `https://icon.horse/icon/${domain}`,
      ];

      for (const url of services) {
        try {
          const upstream = await fetch(url);
          if (upstream.ok) {
            const buf = Buffer.from(await upstream.arrayBuffer());
            res.setHeader(
              "Content-Type",
              upstream.headers.get("content-type") ?? "image/png",
            );
            res.setHeader("Cache-Control", "public, max-age=86400");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.end(buf);
            return;
          }
        } catch {
          /* try next */
        }
      }

      res.statusCode = 204;
      res.end();
    });
  },
});

/** Reads the full request body as a parsed JSON object. */
const readBody = (
  req: import("node:http").IncomingMessage,
): Promise<Record<string, string>> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () =>
      resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}")),
    );
  });

/**
 * Dev-only: proxies POST /api/auth/google/token to Google's token endpoint,
 * injecting the client secret from the local .env file so it never touches
 * the client bundle.  Mirrors the logic of api/auth/google/token.js exactly.
 */
const googleTokenProxy = (): Plugin => ({
  name: "google-token-proxy",
  configureServer(server) {
    server.middlewares.use("/api/auth/google/token", async (req, res, next) => {
      if (req.method === "OPTIONS") {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        res.statusCode = 204;
        res.end();
        return;
      }
      if (req.method !== "POST") return next();

      const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
      if (!clientId || !clientSecret) {
        res.statusCode = 503;
        res.end(
          JSON.stringify({ error: "Google OAuth not configured — check .env" }),
        );
        return;
      }

      const parsed = await readBody(req);
      const grantType = parsed.grant_type || "authorization_code";

      const params = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: grantType,
      });
      if (grantType === "refresh_token") {
        if (!parsed.refresh_token) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "refresh_token required" }));
          return;
        }
        params.set("refresh_token", parsed.refresh_token);
      } else {
        const { code, code_verifier, redirect_uri } = parsed;
        if (!code || !code_verifier || !redirect_uri) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: "code, code_verifier and redirect_uri are required",
            }),
          );
          return;
        }
        params.set("code", code);
        params.set("code_verifier", code_verifier);
        params.set("redirect_uri", redirect_uri);
      }

      const upstream = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params,
      });
      const data = await upstream.json();
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.statusCode = upstream.status;
      res.end(
        JSON.stringify(
          upstream.ok
            ? {
              access_token: data.access_token,
              refresh_token: data.refresh_token ?? null,
              expires_in: data.expires_in,
            }
            : {
              error:
                data.error_description ||
                data.error ||
                "token_exchange_failed",
            },
        ),
      );
    });
  },
});

// ── RSS feed proxy helpers (shared by rssProxy plugin + api/rss/feed.js) ──────────

const RSS_SOURCE_NAMES: Record<string, string> = {
  "news.ycombinator.com": "Hacker News",
  "feeds.bbci.co.uk": "BBC News",
  "ekantipur.com": "Kantipur",
  "myrepublica.nagariknetwork.com": "Republica",
  "kathmandupost.com": "Kathmandu Post",
};

function rssSourceName(feedUrl: string): string {
  try {
    const hostname = new URL(feedUrl).hostname.replace(/^www\./, "");
    return RSS_SOURCE_NAMES[hostname] || hostname;
  } catch {
    return "";
  }
}

function rssStripCdata(str: string): string {
  return str.replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1").trim();
}

function rssExtractTag(block: string, tag: string): string {
  const m = block.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  return m ? rssStripCdata(m[1]) : "";
}

type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  isoDate: string;
  source: string;
};

/**
 * Parse RSS 2.0 or ATOM XML into a normalised items array (max 10).
 * Mirrors the logic in api/rss/feed.js exactly.
 */
function parseRssXml(xml: string, feedUrl: string): RssItem[] {
  const source = rssSourceName(feedUrl);
  const items: RssItem[] = [];

  // ── RSS 2.0 ────────────────────────────────────────────────────────────
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml)) !== null && items.length < 10) {
    const block = m[1];
    const title = rssExtractTag(block, "title");
    const link = rssExtractTag(block, "link");
    const pubDate = rssExtractTag(block, "pubDate");
    let isoDate = "";
    try {
      if (pubDate) isoDate = new Date(pubDate).toISOString();
    } catch { }
    if (title) items.push({ title, link, pubDate, isoDate, source });
  }

  // ── ATOM fallback ──────────────────────────────────────────────────────
  if (items.length === 0) {
    const entryRe = /<entry[^>]*>([\s\S]*?)<\/entry>/gi;
    while ((m = entryRe.exec(xml)) !== null && items.length < 10) {
      const block = m[1];
      const title = rssExtractTag(block, "title");
      const linkHrefM = block.match(/<link[^>]*href=["']([^"']+)["']/i);
      const link = linkHrefM ? linkHrefM[1] : rssExtractTag(block, "id");
      const pubDate =
        rssExtractTag(block, "updated") || rssExtractTag(block, "published");
      let isoDate = "";
      try {
        if (pubDate) isoDate = new Date(pubDate).toISOString();
      } catch { }
      if (title) items.push({ title, link, pubDate, isoDate, source });
    }
  }

  return items;
}

/**
 * Dev-only: proxies /api/suggest?client=chrome&q=... to suggestqueries.google.com
 * and /api/suggest/ddg?q=... to duckduckgo.com server-side, bypassing CORS.
 * In the real extension, host_permissions handles this natively.
 */
const suggestProxy = (): Plugin => ({
  name: "suggest-proxy",
  configureServer(server) {
    server.middlewares.use("/api/suggest", async (req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end();
        return;
      }
      const qs = (req.url ?? "").split("?")[1] ?? "";
      const params = new URLSearchParams(qs);
      const q = params.get("q") ?? "";
      const client = params.get("client") ?? "chrome";
      const ds = params.get("ds") ?? "";

      let upstream: string;
      if (ds) {
        upstream = `https://suggestqueries.google.com/complete/search?client=${client}&ds=${ds}&q=${encodeURIComponent(q)}`;
      } else if (client === "ddg") {
        upstream = `https://duckduckgo.com/ac/?type=list&q=${encodeURIComponent(q)}`;
      } else {
        upstream = `https://suggestqueries.google.com/complete/search?client=${client}&q=${encodeURIComponent(q)}`;
      }

      try {
        const r = await fetch(upstream, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        let text = await r.text();
        // Google returns JSONP (window.google.ac.h([...])) when called from non-browser agents.
        // Strip the wrapper so the client always receives plain JSON.
        const jsonpMatch = /^window\.google\.ac\.h\((.+)\)$/s.exec(text);
        if (jsonpMatch) text = jsonpMatch[1];
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.statusCode = r.status;
        res.end(text);
      } catch (e) {
        console.error("Suggest proxy error:", e);
        res.statusCode = 502;
        res.end("[]");
      }
    });
  },
});

/**
 * Dev-only: proxies GET /api/rss/feed?url=... to the real feed URL server-side,
 * bypassing CORS restrictions that block extension and web origins.
 * Mirrors the logic of api/rss/feed.js exactly (parseRssXml is shared above).
 */
const rssProxy = (): Plugin => ({
  name: "rss-proxy",
  configureServer(server) {
    server.middlewares.use("/api/rss/feed", async (req, res) => {
      if (req.method !== "GET") {
        res.statusCode = 405;
        res.end();
        return;
      }
      const qs = (req.url ?? "").split("?")[1] ?? "";
      const url = decodeURIComponent(new URLSearchParams(qs).get("url") ?? "");
      if (!url.startsWith("http")) {
        res.statusCode = 400;
        res.end('{"items":[]}');
        return;
      }
      try {
        const r = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0" },
        });
        const xml = await r.text();
        const items = parseRssXml(xml, url);
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.end(JSON.stringify({ items, fetchedAt: new Date().toISOString() }));
      } catch {
        res.statusCode = 502;
        res.end('{"items":[],"error":"fetch_failed"}');
      }
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const dynamicManifest = JSON.parse(JSON.stringify(manifest));
  if (dynamicManifest.oauth2) {
    dynamicManifest.oauth2.client_id =
      env.EXTENSION_CLIENT_ID || dynamicManifest.oauth2.client_id;
  }

  return {
    plugins: [
      // Must be first — transforms import.meta.env.VITE_* before Vite's own define pass.
      obscureEnvKeys([
        "VITE_API_KEY",
        "VITE_SPOTIFY_CLIENT_ID",
        "VITE_GOOGLE_DESKTOP_CLIENT_ID",
      ]),
      react(),
      crx({ manifest: dynamicManifest }),
      faviconWaterfall(),
      googleTokenProxy(),
      suggestProxy(),
      rssProxy(),
    ],
    build: {
      // Strip console.warn/console.error in extension production builds.
      // console.error is kept for real runtime errors; warn is dev-only noise.
      minify: "esbuild",
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (
              id.includes("node_modules/react-grid-layout") ||
              id.includes("node_modules/react-resizable")
            )
              return "grid";
            if (id.includes("node_modules/react-bootstrap-icons"))
              return "icons";
            if (id.includes("node_modules/dayjs")) return "datetime";
            if (id.includes("node_modules/zustand")) return "store";
            if (
              id.includes("node_modules/react-dom") ||
              id.includes("node_modules/react/")
            )
              return "engine";
          },
        },
      },
    },
    server: {
      port: 3000,
      cors: true,
      proxy: {
        "/np-api": {
          target: "https://nepalipaisa.com",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/np-api/, "/api"),
        },
        "/ml-api": {
          target: "https://www.merolagani.com",
          changeOrigin: true,
          rewrite: (path) =>
            path.replace(/^\/ml-api/, "/handlers/TechnicalChartHandler.ashx"),
        },
      },
    },
  };
});
