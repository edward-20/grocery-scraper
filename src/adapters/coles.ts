import type { Page } from "playwright";
import type { ProductSnapshot, ScrapeTarget } from "../types.js";
import { discoverLinks, normalizeGenericProduct, scrapeWithFallback } from "./common.js";
import type { RetailerAdapter } from "./retailerAdapter.js";

export class ColesAdapter implements RetailerAdapter {
  readonly name = "coles" as const;

  discoverProductUrls(page: Page, target: ScrapeTarget): Promise<string[]> {
    return discoverLinks(page, target.url, [/\/product\//, /\/products\//], target.maxPages);
  }

  scrapeProduct(page: Page, url: string): Promise<ProductSnapshot> {
    return scrapeWithFallback(page, this.name, url, (snapshot, resolvedUrl) =>
      normalizeGenericProduct(this.name, snapshot, resolvedUrl),
    );
  }
}
