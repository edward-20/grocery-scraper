import { chromium, type Browser, Page } from "playwright";
import type { GroceryRepository } from "../db/repository.js";
import type { ScraperConfig, RetailerScrapeConfig, RunId, RetailerName, CategoryId } from "../types.js";
import { Product } from "./retailerScraper.js";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";
import { sleep } from "../utils/time.js";
import { Category } from "./retailerScraper.js";

export async function runScrape(config: ScraperConfig, repository: GroceryRepository): Promise<RunId> {
  const runId = repository.createRun();
  const browser = await chromium.launch({ headless: config.browser.headless });

  try {
    for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
      await runRetailerScrape(browser, config, repository, runId, retailer);
    }
  } catch (error) {
    repository.runEncounteredError(runId, error); // mark error
  } finally {
    await browser.close();
  }

  return repository.finishRun(runId);
}

async function runRetailerScrape(
  browser: Browser,
  config: ScraperConfig,
  repository: GroceryRepository,
  runId: RunId,
  retailer: RetailerScrapeConfig,
): Promise<void> {
  const retailerScrapeId = repository.createRetailerScrape(runId, retailer.name);

  const context = await browser.newContext({
    locale: "en-AU",
    timezoneId: "Australia/Sydney",
    userAgent:
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });
  context.setDefaultNavigationTimeout(config.scrape.navigationTimeoutMs);
  const page = await context.newPage();

  try {
    // maybe just try to just go to the retailer page to see if we got scrape trapped?
    await sleep(config.scrape.throttleMs);

    let retailerScraper : RetailerScraper;
    switch (retailer.name) {
      case "Coles" :
        retailerScraper = new ColesScraper(retailer);
      case "Woolworths" :
        retailerScraper = new WoolworthsScraper(retailer);
    }

    const categories = await retailerScraper.discoverCategories(page);
    for (const category of categories)  {
      await runCategoryScrape(page, repository, category, retailer.name, retailerScrapeId, retailerScraper);
    }
  } catch (error) {
    repository.retailerScrapeEncounteredError(retailerScrapeId, "");
  } finally {
    await page.close();
    await context.close();
  }

  repository.finishRetailerScrape(retailerScrapeId);
}

async function runCategoryScrape(
  page: Page,
  repository: GroceryRepository,
  category: Category,
  retailerName: RetailerName,
  retailerScrapeId: number,
  retailerScraper: RetailerScraper
) {
  let categoryId : CategoryId;
  switch (retailerName) {
    case "Coles":
      categoryId = repository.createColesCategory(category);
    case "Woolworths":
      categoryId = repository.createWoolworthsCategory(category);
  }
  const categoryScrapeId = repository.createCategoryScrape(retailerScrapeId, category);

  // find number of pages
  const numberOfPages = retailerScraper.findPageCountPerCategory(page, category);
  repository.updatePages(categoryScrapeId, numberOfPages);

  for (let i = 1; i <= numberOfPages; i++) {
    let products: Product[];
    try {
      products = await retailerScraper.scrapeProductsOfCategoryPage(page, category, i);
      for (const product of products) {
        repository.createOrUpdateProduct(product);
      }
    } catch (error) {
      console.error("error scraping products of category page")
    }
  }

  repository.finishCategoryScrape(categoryScrapeId);
}
