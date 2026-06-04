import type { DatabaseSync } from "node:sqlite";
import type { ScrapeRun } from "../types.js";
import { nowIso } from "../utils/time.js";

export class GroceryRepository {
  constructor(private readonly db: DatabaseSync, private readonly scrapeRun: ScrapeRun) {}

  createRun(): ScrapeRun {
    const startedAt = nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO scrape_runs (started_at, status)
         VALUES (?, 'running')`,
      )
      .run(startedAt);

    return { 
      id: Number(result.lastInsertRowid),  
      productsScanned: 0,
      newProductsAdded: 0,
      retailerSummaries: {},
      errors: 0,
      timeStarted: startedAt,
      timeEnded: null
    };
  }

  finishRun(runId: number, status: "ok" | "error", errorMessage?: string): void {
    this.db
      .prepare(
        `UPDATE scrape_runs
         SET finished_at = ?, status = ?, error_message = ?
         WHERE id = ?`,
      )
      .run(nowIso(), status, errorMessage ?? null, runId);
  }

  incrementNewProductsAdded(n : number) {
    this.scrapeRun.newProductsAdded += n;
  }
}
