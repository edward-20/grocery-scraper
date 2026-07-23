import { chromium, type Browser, Page } from "playwright";
import type { GroceryRepository, ScrapeRun } from "../db/repository.js";
import type { ScraperConfig, RetailerScrapeConfig, RunId, RetailerName, CategoryId } from "../types.js";
import { ColesScraper } from "./colesScraper.js";
import { WoolworthsScraper } from "./woolworthsScraper.js";
import { RetailerScraper } from "./retailerScraper.js";
import { sleep } from "../utils/time.js";
import { Category } from "../db/repository.js";
import { UndefinedRetailerForCategoryCreationError, UndefinedRetailerForScraperCreationError } from "./errors.js"
import { CategoryCreateError, CategoryScrapeCreateError, CategoryScrapeWriteError, ProductCreateOrUpdateError, ScrapeRunWriteError } from "../db/errors.js";

export async function runScrape(config: ScraperConfig, repository: GroceryRepository): Promise<ScrapeRun> {
  const scrapeRun = repository.createRun();
  const browser = await chromium.launch({ headless: config.browser.headless });

  try {
    for (const retailer of config.retailers.filter((candidate) => candidate.enabled)) {
      await runRetailerScrape(browser, config, repository, scrapeRun.id, retailer); // what can be thrown here?
    }
  } catch (error) {
    if (error instanceof ScrapeRunWriteError) {
      repository.markRunFailed(scrapeRun.id, error.message); // mark error
    }
    console.error(error);
  } finally {
    await browser.close();
    return repository.finishRun(scrapeRun.id);
  }
}

// what errors can this throw?
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
    repository.markRetailerScrapeFailed(retailerScrapeId, "");
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
  // initialising the category scrape
  let categoryScrapeId: number;
  try {
    const categoryId = repository.createOrFindCategory(category, retailerName);
    categoryScrapeId = repository.createCategoryScrape(retailerScrapeId, category, categoryId);
  } catch (error) {
    if (error instanceof CategoryCreateError || error instanceof CategoryScrapeCreateError) {
      console.error(`${error.message}. Subsequently couldn't begin category scrape.`);
      return;
    }
    throw new Error("Category Scrape Failed", {cause: error});
  }

  try {
    const products = await retailerScraper.scrapeProductsOfCategory(page, category);
    for (const product of products) {
      try {
        await repository.createOrUpdateProduct(product, categoryScrapeId);
      } catch (error) {
        if (error instanceof ProductCreateOrUpdateError) {
          console.error(error.message);
        } else {
          throw error;
        }
      }
    }
  } catch (error) {
    if (error instanceof CategoryScrapeWriteError) {
      console.error(`${error.message}. Subsequently cancelling category scrape.`);
      repository.markCategoryScrapeFailed(error.categoryScrapeId, "Error encountered whilst scraping category");
    } else {
      console.error(`Unanticipated error in category scrape: ${error}`);
    } 
  } finally {
    repository.finishCategoryScrape(categoryScrapeId);
  }
}
