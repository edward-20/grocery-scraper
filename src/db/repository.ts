import type { DatabaseSync } from "node:sqlite";
import type { ScrapeRun } from "../types.js";
import { nowIso } from "../utils/time.js";
import { RetailerName, RetailerSummary, CategorySummary } from "../types.js";
import { warn } from "console";

type RunId = number;
type CategoryPath = string;  // enforce stricter maybe later on

export class GroceryRepository {
  /*
  *
  * A repository is a programming pattern/class whose job is to hide the database details from the rest of your application.
  * possibly subdivide this into product related and system related
  */
  constructor(private readonly db: DatabaseSync) {}

  // Scrape Runs
  createRun(): RunId {
    throw new Error("Not implemented");
  }

  finishRun(runId: RunId, errorMessage?: string): RunId {
    throw new Error("Not implemented");
  }

  // Retailer Summary
  createRetailerSummary(runId: RunId, retailer: RetailerName): RetailerSummary {
    throw new Error("Not implemented");
  }

  caughtInScrapeTrap(runId: RunId, retailer: RetailerName) {
    throw new Error("Not implemented");
  }

  finishRetailerScrape(runId: RunId, retailer: RetailerName, errorMessage?: string): RetailerSummary {
    throw new Error("Not implemented");
  }

  // Category Summary
  createCategorySummary(runId: RunId, retailer: RetailerName, path: CategoryPath, name: string): CategorySummary {
    throw new Error("Not implemented");
  }
  // what if an error happens somewhere concerning the scraping of a category?
  // whose to handle it? its not here mate, this is the repository, only
  // database interactions
  
  foundNumberOfPagesForCategory(runId: RunId, retailer: RetailerName, path: CategroyPath, pages: number): void {
    throw new Error("Not implemented");
  }

  successfulPageScrapeForCategory(runId: RunId, retailer: RetailerName, path: CategroyPath, productsScraped: number, newProductsFound: number): void {
    throw new Error("Not implemented");
  }

  categoryScrapeError(runId: RunId, retailer: RetailerName, path: CategoryPath, error_message: string): void {
    throw new Error("Not implemented");
  }

  // Product Summary
  createProductSummary(runId: RunId, retailer: RetailerName, categoryPath: CategoryPath, productPath: string): ProductSummary {
    throw new Error("Not implemented");
  }

  productScrapeError(error_message: string): void {
    throw new Error("Not implemented");
  }

  // Value at Time
  // Products
}
