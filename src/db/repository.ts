import type { DatabaseSync } from "node:sqlite";
import type { RetailerName, ScrapeRun } from "../types.js";
import { nowIso } from "../utils/time.js";

export class GroceryRepository {
  constructor(private readonly db: DatabaseSync) {}

  createRun(retailer: RetailerName): ScrapeRun {
    const startedAt = nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO scrape_runs (retailer, started_at, status)
         VALUES (?, ?, ?, 'running')`,
      )
      .run(retailer ?? null, startedAt);

    return { id: Number(result.lastInsertRowid), retailer };
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
}
