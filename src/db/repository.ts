import type { DatabaseSync } from "node:sqlite";
import type { ProductCore, ProductSnapshot, RetailerName, ScrapeRun } from "../types.js";
import { nowIso } from "../utils/time.js";

export class GroceryRepository {
  constructor(private readonly db: DatabaseSync) {}

  createRun(retailer?: RetailerName, targetName?: string): ScrapeRun {
    const startedAt = nowIso();
    const result = this.db
      .prepare(
        `INSERT INTO scrape_runs (retailer, target_name, started_at, status)
         VALUES (?, ?, ?, 'running')`,
      )
      .run(retailer ?? null, targetName ?? null, startedAt);

    return { id: Number(result.lastInsertRowid), retailer, targetName };
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

  saveSnapshot(runId: number, snapshot: ProductSnapshot): number | undefined {
    const productId = snapshot.status === "ok" ? this.upsertProduct(snapshot.core) : undefined;
    const scrapedAt = nowIso();

    this.db
      .prepare(
        `INSERT INTO product_snapshots (
          product_id,
          scrape_run_id,
          retailer,
          url,
          raw_json,
          normalized_json,
          status,
          error_message,
          scraped_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        productId ?? null,
        runId,
        snapshot.core.retailer,
        snapshot.core.url,
        JSON.stringify(snapshot.raw),
        JSON.stringify(snapshot.normalized),
        snapshot.status,
        snapshot.errorMessage ?? null,
        scrapedAt,
      );

    return productId;
  }

  upsertProduct(product: ProductCore): number {
    const timestamp = nowIso();
    this.db
      .prepare(
        `INSERT INTO products (
          retailer,
          retailer_product_id,
          url,
          name,
          brand,
          image_url,
          package_size,
          price,
          unit_price,
          availability,
          currency,
          last_scraped_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(retailer, url) DO UPDATE SET
          retailer_product_id = excluded.retailer_product_id,
          name = excluded.name,
          brand = excluded.brand,
          image_url = excluded.image_url,
          package_size = excluded.package_size,
          price = excluded.price,
          unit_price = excluded.unit_price,
          availability = excluded.availability,
          currency = excluded.currency,
          last_scraped_at = excluded.last_scraped_at,
          updated_at = excluded.updated_at`,
      )
      .run(
        product.retailer,
        product.retailerProductId ?? null,
        product.url,
        product.name,
        product.brand ?? null,
        product.imageUrl ?? null,
        product.packageSize ?? null,
        product.price ?? null,
        product.unitPrice ?? null,
        product.availability ?? null,
        product.currency ?? null,
        timestamp,
        timestamp,
        timestamp,
      );

    const row = this.db
      .prepare(`SELECT id FROM products WHERE retailer = ? AND url = ?`)
      .get(product.retailer, product.url) as { id: number };
    return row.id;
  }
}
