import type { Page } from "playwright";

export interface RetailerAdapter {
  readonly name: ProductSnapshot["core"]["retailer"];
  discoverProductUrls(page: Page, target: ScrapeTarget): Promise<string[]>;
  scrapeProduct(page: Page, url: string): Promise<ProductSnapshot>;
}
