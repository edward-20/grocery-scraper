import { chromium, type Browser } from "playwright";
import type { GroceryRepository } from "../db/repository.js";
import { createAdapters } from "../adapters/index.js";
import type { RetailerConfig, ScraperConfig } from "../types.js";
import { sleep } from "../utils/time.js";

export interface ScrapeSummary {
  productsScanned: number;
  errors: number;
}

export async function runScrape(config: ScraperConfig, repository: GroceryRepository): Promise<ScrapeSummary> {
  const adapters = createAdapters();
  const summary: ScrapeSummary = {
    discoveredProducts: 0,
    errors: 0,
  };

  const browser = await chromium.launch({ headless: config.browser.headless });
  try {
    for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
      await runRetailer(browser, config, repository, retailer, summary, adapters[retailer.name]);
    }
  } finally {
    await browser.close();
  }

  return summary;
}

async function runRetailer(
  browser: Browser,
  config: ScraperConfig,
  repository: GroceryRepository,
  retailer: RetailerConfig,
  summary: ScrapeSummary,
  adapter: ReturnType<typeof createAdapters>[RetailerConfig["name"]],
): Promise<void> {
  const context = await browser.newContext({
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  context.setDefaultNavigationTimeout(config.scrape.navigationTimeoutMs);

  try {
    const run = repository.createRun(retailer.name);
    const page = await context.newPage();
    let runStatus: "ok" | "error" = "ok";
    let runError: string | undefined;

    try {
      // use the adapter to scan the catalogs and then the products

      for (const productUrl of productUrls) {
        await sleep(config.scrape.throttleMs);
        const snapshot = await adapter.scrapeProduct(page, productUrl);
        repository.saveSnapshot(run.id, snapshot);
        summary.savedSnapshots += 1;
        if (snapshot.status === "error") {
          summary.errors += 1;
        }
      }
    } catch (error) {
      runStatus = "error";
      runError = error instanceof Error ? error.message : String(error);
      summary.errors += 1;
    } finally {
      repository.finishRun(run.id, runStatus, runError);
      await page.close();
    }
  } finally {
    await context.close();
  }
}
