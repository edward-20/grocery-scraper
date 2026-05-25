import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { GroceryRepository } from "../src/db/repository.js";
import { migrate } from "../src/db/schema.js";

describe("GroceryRepository", () => {
  it("upserts latest product data while appending snapshots", () => {
    const db = new DatabaseSync(":memory:");
    migrate(db);
    const repository = new GroceryRepository(db);
    const run = repository.createRun("coles", "milk");

    repository.saveSnapshot(run.id, {
      status: "ok",
      core: {
        retailer: "coles",
        url: "https://www.coles.com.au/product/test-milk-1",
        name: "Test Milk",
        price: 4,
      },
      raw: { price: 4 },
      normalized: { price: 4 },
    });

    repository.saveSnapshot(run.id, {
      status: "ok",
      core: {
        retailer: "coles",
        url: "https://www.coles.com.au/product/test-milk-1",
        name: "Test Milk",
        price: 4.5,
      },
      raw: { price: 4.5 },
      normalized: { price: 4.5 },
    });

    const productCount = db.prepare("SELECT COUNT(*) AS count FROM products").get() as { count: number };
    const snapshotCount = db.prepare("SELECT COUNT(*) AS count FROM product_snapshots").get() as { count: number };
    const product = db.prepare("SELECT price FROM products").get() as { price: number };

    expect(productCount.count).toBe(1);
    expect(snapshotCount.count).toBe(2);
    expect(product.price).toBe(4.5);

    db.close();
  });
});
