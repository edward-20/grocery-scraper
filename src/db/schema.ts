import type { DatabaseSync } from "node:sqlite";

export function migrate(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retailer TEXT,
      target_name TEXT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      retailer TEXT NOT NULL,
      retailer_product_id TEXT,
      url TEXT NOT NULL,
      name TEXT NOT NULL,
      brand TEXT,
      image_url TEXT,
      package_size TEXT,
      price REAL,
      unit_price TEXT,
      availability TEXT,
      currency TEXT,
      last_scraped_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(retailer, url)
    );

    CREATE INDEX IF NOT EXISTS idx_products_retailer_product_id
      ON products(retailer, retailer_product_id);

    CREATE TABLE IF NOT EXISTS product_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER,
      scrape_run_id INTEGER NOT NULL,
      retailer TEXT NOT NULL,
      url TEXT NOT NULL,
      raw_json TEXT NOT NULL,
      normalized_json TEXT NOT NULL,
      status TEXT NOT NULL,
      error_message TEXT,
      scraped_at TEXT NOT NULL,
      FOREIGN KEY(product_id) REFERENCES products(id),
      FOREIGN KEY(scrape_run_id) REFERENCES scrape_runs(id)
    );

    CREATE INDEX IF NOT EXISTS idx_product_snapshots_product_id
      ON product_snapshots(product_id);

    CREATE INDEX IF NOT EXISTS idx_product_snapshots_scrape_run_id
      ON product_snapshots(scrape_run_id);
  `);
}
