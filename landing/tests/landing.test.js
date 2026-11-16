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
