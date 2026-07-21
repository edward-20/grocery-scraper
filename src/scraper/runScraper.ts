import { chromium, type Browser, Page } from "playwright";
import type { GroceryRepository, ScrapeRun } from "../db/repository.js";
import type { ScraperConfig, RetailerScrapeConfig, RunId, RetailerName, CategoryId } from "../types.js";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";
import { sleep } from "../utils/time.js";
import { Category } from "../db/repository.js";
import { UndefinedRetailerForCategoryCreationError, UndefinedRetailerForScraperCreationError } from "./errors.js"
import { RetailerScrapeCreateError } from "../db/errors.js";

export async function runScrape(config: ScraperConfig, repository: GroceryRepository): Promise<ScrapeRun> {
  let runId: RunId;
  let browser: Browser;
  try {
    ({ id: runId } = repository.createRun());
  } catch (error) {
    if (error instanceof RetailerScrapeCreateError) {
      console.error(error.message);
    } else {
      throw error;
    }
  }
  browser = await chromium.launch({ headless: config.browser.headless });

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
    await sleep(config.scrape.throttleMs);

    let retailerScraper : RetailerScraper;
    switch (retailer.name) {
      case "Coles" :
        retailerScraper = new ColesScraper(retailer);
        break;
      case "Woolworths" :
        retailerScraper = new WoolworthsScraper(retailer);
        break;
      default:
        throw new UndefinedRetailerForScraperCreationError(`Unknown retailer: ${retailer.name}`)
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
  try {
    let categoryId : CategoryId;
    switch (retailerName) {
      case "Coles":
        categoryId = repository.createColesCategory(category);
        break;
      case "Woolworths":
        categoryId = repository.createWoolworthsCategory(category);
        break;
      default:
        throw new UndefinedRetailerForCategoryCreationError(retailerName); // category doesn't exis
    }
    const categoryScrapeId = repository.createCategoryScrape(retailerScrapeId, category);

    const products = await retailerScraper.scrapeProductsOfCategory(page, category);
    for (const product of products) {
      repository.createOrUpdateProduct(product, categoryScrapeId); // need to be able to create a products and value_at_time row
    }
  } catch (error) {
    repository.categoryScrapeErrorEncountered(categoryScrapeId, "Error encountered whilst scraping category");
    console.error("error scraping products of category page")
  }
  repository.finishCategoryScrape(categoryScrapeId);
}
