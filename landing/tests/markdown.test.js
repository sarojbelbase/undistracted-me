import { describe, it, expect, vi } from "vitest";
import { onRequest } from "../functions-src/index.js";

const MARKDOWN_BODY = "# Undistracted Me\n\n> A calm new tab.\n";

function makeContext({ path = "/", method = "GET", accept = "text/markdown", assetOk = true, assetThrows = false } = {}) {
  const next = vi.fn(() => "NEXT");
  const assetResponse = new Response(MARKDOWN_BODY, {
    headers: { "Cache-Control": "max-age=300" },
  });
  const fetch = vi.fn(() => {
    if (assetThrows) throw new Error("no ASSETS binding");
    return assetOk ? assetResponse : new Response("missing", { status: 404 });
  });
  const request = new Request(`https://undistracted.me${path}`, {
    method,
    headers: accept ? { Accept: accept } : {},
  });
  return {
    request,
    next,
    env: { ASSETS: { fetch } },
    fetch,
    assetResponse,
  };
}

describe("landing markdown content negotiation", () => {
  it("serves text/markdown for / when Accept requests it", async () => {
    const { request, next, fetch } = makeContext();
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });

    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(res.headers.get("Vary")).toBe("Accept");
    expect(await res.text()).toBe(MARKDOWN_BODY);
    // Must NOT fall through to next().
    expect(next).not.toHaveBeenCalled();
  });

  it("fetches the built /index.md asset (DRY, no duplication)", async () => {
    const { request, next, fetch } = makeContext();
    await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe("https://undistracted.me/index.md");
  });

  it("also negotiates the explicit /index.html path", async () => {
    const { request, next, fetch } = makeContext({ path: "/index.html" });
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(res.headers.get("Content-Type")).toBe("text/markdown; charset=utf-8");
    expect(next).not.toHaveBeenCalled();
  });

  it("falls through when the client does not ask for markdown", async () => {
    const { request, next, fetch } = makeContext({ accept: "text/html" });
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(res).toBe("NEXT");
    expect(next).toHaveBeenCalledTimes(1);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls through for non-GET methods", async () => {
    const { request, next, fetch } = makeContext({ method: "POST" });
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(res).toBe("NEXT");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls through for non-homepage paths", async () => {
    const { request, next, fetch } = makeContext({ path: "/pp-and-tos" });
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(res).toBe("NEXT");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falls through when the markdown asset is missing", async () => {
    const { request, next, fetch } = makeContext({ assetOk: false });
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(res).toBe("NEXT");
  });

  it("falls through safely when ASSETS is unavailable", async () => {
    const { request, next, fetch } = makeContext({ assetThrows: true });
    const res = await onRequest({ request, next, env: { ASSETS: { fetch } } });
    expect(res).toBe("NEXT");
  });
});
