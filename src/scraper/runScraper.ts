import { chromium, type Browser } from "playwright";
import type { GroceryRepository } from "../db/repository.js";
import type { ScraperConfig, Product, RetailerScrapeConfig, RunId, CategoryId } from "../types.js";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";
import { sleep } from "../utils/time.js";

export async function runScrape(config: ScraperConfig, repository: GroceryRepository): Promise<RunId> {
  const runId = repository.createRun();
  const browser = await chromium.launch({ headless: config.browser.headless });
  try {
    for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
      await runRetailer(browser, config, repository, runId, retailer);
    }
  } finally {
    await browser.close();
  }

  return repository.finishRun(runId);
}

async function runRetailer(
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

  // try clause for browser context (cleaning up the context on error)
  try {
    const page = await context.newPage();
    let runStatus: "ok" | "error" = "ok";
    let runError: string | undefined;

    // try clause for browser page (cleaning up the page on error)
    try {
      await sleep(config.scrape.throttleMs);

      let retailerScraper : RetailerScraper;
      switch (retailer.name) {
        case "Coles" :
          retailerScraper = new ColesScraper(retailer, runId);
        case "Woolworths" :
          retailerScraper = new WoolworthsScraper(retailer, runId);
      }

      const categories = await retailerScraper.discoverCategories(page);
      for (const category of categories) {
        // create a category
        let categoryId : CategoryId;
        switch (retailer.name) {
          case "Coles":
            categoryId = repository.createColesCategory(category);
          case "Woolworths":
            categoryId = repository.createWoolworthsCategory(category);
        }
        // create category scrape run
        const categoryScrapeId = repository.createCategoryScrape(retailerScrapeId, category);

        // find the number of pages of the category and update the category scrape run
        const numberOfPages = retailerScraper.findPageCountPerCategory(page, category);
        repository.updatePages(categoryScrapeId, numberOfPages);

        // for each page, scrape the products and update the categoryScrapeRun.
        // This is the crux of this project
        for (let i = 1; i <= numberOfPages; i++) {
          let products: Product[];
          try {
            products = await retailerScraper.scrapeProductsOfCategoryPage(page, category, i);
          } catch (error) {
            console.error("error scraping products of category page")
          }
          // use the repository to write some stuff for the run
          for (const product of products) {
            const currentValueId = repository.createValueAtTime(product.value);
            repository.createProduct({
              categoryId: 5,
              retailerProductId: "re",
              crossRetailerId: "a",
              gtinFormat: 13,
              currentValue: currentValueId, 
              name: "a",
              brand: "a",
              path: "a",
              description: "a",
              image_url: "a",
            })
          }
        }
      }
    } catch (error) {
      runStatus = "error";
      runError = error instanceof Error ? error.message : String(error);
      // write some stuff to the repository to indicate error
    } finally {
      await page.close();
    }
  } finally {
    await context.close();
  }

  repository.finishRetailerScrape(retailerScrapeId);
}
