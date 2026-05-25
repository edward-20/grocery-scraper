import { describe, expect, it } from "vitest";
import { normalizeUrl, uniqueUrls } from "../src/utils/url.js";

describe("url utilities", () => {
  it("normalizes relative URLs and removes hashes", () => {
    expect(normalizeUrl("/product/123#reviews", "https://www.coles.com.au/search?q=milk")).toBe(
      "https://www.coles.com.au/product/123",
    );
  });

  it("deduplicates normalized URLs", () => {
    expect(uniqueUrls(["https://example.com/a#one", "https://example.com/a#two"])).toEqual(["https://example.com/a"]);
  });
});
