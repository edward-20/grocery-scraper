import { chromium, type Browser } from "playwright";
import type { GroceryRepository } from "../db/repository.js";
import type { RetailerScrapeConfig, ScraperConfig } from "../types.js";
import { sleep } from "../utils/time.js";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";

export async function runScrape(config: ScraperConfig, repository: GroceryRepository): Promise<ScrapeSummary> {
  const retailerScrapers = createRetailerScrapers(config);

  const browser = await chromium.launch({ headless: config.browser.headless });
  try {
    for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
      await runRetailer(browser, config, repository, retailer);
    }
  } finally {
    await browser.close();
  }

  repository.finishRun(retailerScrapers.id)
}

async function runRetailer(
  browser: Browser,
  config: ScraperConfig,
  repository: GroceryRepository,
  retailer: RetailerScrapeConfig,
  summary: ScrapeSummary,
): Promise<void> {
  const context = await browser.newContext({
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  context.setDefaultNavigationTimeout(config.scrape.navigationTimeoutMs);

  try {
    const run = repository.createRun(); // pass the ScrapeRun down in order to update
    const page = await context.newPage();
    let runStatus: "ok" | "error" = "ok";
    let runError: string | undefined;

    try {
      await sleep(config.scrape.throttleMs);

      let retailerScraper : RetailerScraper;
      switch (retailer.name) {
        case "coles" :
          retailerScraper = new ColesScraper(retailer);
        case "woolworths" :
          retailerScraper = new WoolworthsScraper(retailer);
      }

      const categories = await retailerScraper.discoverCategories(page);
      for (const category of categories) {
        const numberOfPages = retailerScraper.findPageCountPerCategory(page, category);
        for (let i = 1; i <= numberOfPages; i++) {
          retailerScraper.scrapeProductsOfCategoryPage(page, category, i);
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
