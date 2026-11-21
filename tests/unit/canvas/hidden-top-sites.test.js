import { describe, it, expect, beforeEach } from "vitest";
import {
  getHiddenTopSites,
  hideTopSite,
  unhideTopSite,
} from "../../../app/widgets/quickAccess/hiddenSites";

describe("quickAccess hiddenSites", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts empty", () => {
    expect(getHiddenTopSites()).toEqual([]);
  });

  it("hides a site and dedupes on repeat", () => {
    hideTopSite("https://example.com");
    hideTopSite("https://example.com");
    expect(getHiddenTopSites()).toEqual(["https://example.com"]);
  });

  it("unhides a site", () => {
    hideTopSite("https://a.com");
    hideTopSite("https://b.com");
    unhideTopSite("https://a.com");
    expect(getHiddenTopSites()).toEqual(["https://b.com"]);
  });

  it("tolerates corrupt storage", () => {
    localStorage.setItem("hidden_top_sites", "{not json");
    expect(getHiddenTopSites()).toEqual([]);
  });
});
