import { describe, it, expect } from "vitest";
import { site } from "../src/data/site.js";
import { llmsSections } from "../src/data/llms.js";
import { buildSchemaGraph } from "../src/data/schema.js";

describe("Organization schema", () => {
  const graph = buildSchemaGraph();
  const org = graph["@graph"].find((e) => e["@type"] === "Organization");

  it("has name, url, and a logo", () => {
    expect(org.name).toBe(site.name);
    expect(org.url).toBe(site.url);
    expect(org.logo["@type"]).toBe("ImageObject");
    expect(org.logo.url).toBeTruthy();
  });

  it("has a ContactPoint with the support email", () => {
    expect(org.contactPoint["@type"]).toBe("ContactPoint");
    expect(org.contactPoint.email).toBe(site.email);
  });

  it("has a PostalAddress", () => {
    expect(org.address["@type"]).toBe("PostalAddress");
    expect(org.address.addressCountry).toBe("NP");
  });
});

describe("site contact info", () => {
  it("exposes a support email", () => {
    expect(site.email).toMatch(/@undistracted\.me$/);
  });
});

describe("llms.txt sections", () => {
  it("uses numbered navigation sections", () => {
    expect(llmsSections.length).toBeGreaterThan(1);
    llmsSections.forEach((section, i) => {
      expect(section.name).toMatch(new RegExp(`^${i + 1}\\. `));
      expect(section.links.length).toBeGreaterThan(0);
      section.links.forEach((link) => {
        expect(link.url).toMatch(/^https?:\/\//);
        expect(link.title).toBeTruthy();
      });
    });
  });
});

describe("schema type breadth", () => {
  const graph = buildSchemaGraph();
  const nodes = graph["@graph"];
  const types = nodes.map((n) => n["@type"]);

  it("includes content + navigation schema types, not only entities/FAQ", () => {
    expect(types).toContain("Article");
    expect(types).toContain("BreadcrumbList");
    // Breadth: entities + WebSite + SoftwareApplication + WebPage + FAQ + content.
    expect(types.length).toBeGreaterThanOrEqual(8);
  });

  it("links the Article back to the author, org, app and webpage", () => {
    const article = nodes.find((n) => n["@type"] === "Article");
    expect(article.headline).toBeTruthy();
    expect(article.author["@id"]).toBe(`${site.url}/#author`);
    expect(article.publisher["@id"]).toBe(`${site.url}/#org`);
    expect(article.about["@id"]).toBe(`${site.url}/#app`);
    expect(article.mainEntityOfPage["@id"]).toBe(`${site.url}/#webpage`);
    expect(article.datePublished).toBeTruthy();
    expect(article.articleBody.length).toBeGreaterThan(100);
  });

  it("emits a BreadcrumbList rooted at Home", () => {
    const breadcrumb = nodes.find((n) => n["@type"] === "BreadcrumbList");
    expect(breadcrumb.itemListElement).toHaveLength(1);
    const [home] = breadcrumb.itemListElement;
    expect(home.position).toBe(1);
    expect(home.name).toBe("Home");
    expect(home.item).toBe(site.url);
  });
});
