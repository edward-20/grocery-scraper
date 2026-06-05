import type { DatabaseSync } from "node:sqlite";
import type { ScrapeRun } from "../types.js";
import { nowIso } from "../utils/time.js";
import { RetailerName, RetailerSummary } from "../types.js";

export class GroceryRepository {
  /*
  *
  * A repository is a programming pattern/class whose job is to hide the database details from the rest of your application.
  * possibly subdivide this into product related and system related
  */
  constructor(private readonly db: DatabaseSync) {}

  // Scrape Runs
  createRun(): ScrapeRun {
    const startedAt = new Date();
    const result = this.db
      .prepare(
        `INSERT INTO scrape_runs ()
         ();`,
      )
      .run(startedAt.toString());

    // return the values from the row, this is not implemented corrected
    return { 
      id: Number(result.lastInsertRowid),  
      productsScanned: 0,
      newProductsAdded: 0,
      retailerSummaries: {} as Record<RetailerName, RetailerSummary>,
      errors: 0,
      startedAt: new Date(),
      finishedAt: null,
      status: "running"
    };
  }

  finishRun(runId: number, errorMessage?: string): void {
    this.db
      .prepare(
        `UPDATE scrape_runs
         SET finished_at = ?, status = ?, error_message = ?
         WHERE id = ?`,
      )
      .run(nowIso(), "completed", errorMessage ?? null, runId);
  }

  productScanned(runId: number): void {
    this.db
      .prepare(
        `UPDATE scrape_runs
         SET products_scanned += 1
         WHERE id = ?`,
      )
      .run(runId);
  }

  newProductAdded(runId: number): void {
    this.db
      .prepare(
        `UPDATE scrape_runs
         SET new_products_added += 1
         WHERE id = ?`,
      )
      .run(runId);
  }

  // Retailer Summary
  createRetailerSummary(runId: number, retailer: RetailerName, name: string, slug: string): RetailerSummary {}

  caughtInScrapeTrap(runId: number, retailer: RetailerName) {}

  // Category Summary
  createCategorySummary(): CategorySummary {}
  
  updatePageCountOfCategory(pages: number): void {}

  incrementTotalProductsScaped(newProductsScraped: number): void {}

  incrementNewProductsFound(newProductsFound: number): void {}

  successfulPageScrape(): void {}

  categoryScrapeError(error_message: string): void {}

  // Product Summary
  createProductSummary(scrape_run: number, retailer: RetailerName, category_slug: string, url: string): ProductSummary {}

  productScrapeError(error_message: string): void {}
  

}
