import type { DatabaseSync } from "node:sqlite";

export function migrate(db: DatabaseSync): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS retailers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT
    );
    INSERT INTO retailers(name) VALUES ('Woolworths', 'Coles');

    CREATE TABLE IF NOT EXISTS unit_of_measurement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unit TEXT NOT NULL
    );
    INSERT INTO unit_of_measurement ("Each", "Kg", "g", "L", "mL");



    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      started_at TEXT NOT NULL,
      finished_at TEXT,

      status TEXT NOT NULL,
      error_message TEXT,
    );






    CREATE TABLE IF NOT EXISTS value_at_time (
      id PRIMARY KEY AUTOINCREMENT,

      retailer INTEGER NOT NULL,
      retailer_product_id INTEGER NOT NULL,

      -- unit price for comparison regardless of whether the product is discrete or non-discrete
      unit_price REAL NOT NULL,
      -- <unit_price_quantity> of <unit_price_measure_quantity> <unit_price_unit>
      unit_price_quantity REAL NOT NULL,
      unit_price_measure_quantity REAL NOT NULL,
      unit_price_unit INTEGER NOT NULL,

      -- size and price of the product
      size_unit TEXT NOT NULL,
      size_quantity REAL,
      size_quantity_min REAL,
      size_quantity_max REAL,
      price REAL NOT NULL,

      time TEXT NOT NULL,

      run INTEGER NOT NULL,

      FOREIGN KEY (retailer, retailer_product_id) REFERENCES products (retailer, retailer_product_id),
      FOREIGN KEY (unit_price_unit) REFERENCES unit_of_measurement (id),
      FOREIGN KEY (size_unit) REFERENCES unit_of_measurement (id),
      FOREIGN KEY (run) REFERENCES scrape_runs (id)

      CHECK (
        (size_quantity is NOT NULL AND size_quantity_min IS NULL AND size_quantity_max is NULL)
        OR
        (size_quantity is NULL AND size_quantity_min IS NOT NULL AND size_quantity_max is NOT NULL)
      )
    );


    CREATE TABLE IF NOT EXISTS products (
      retailer INTEGER NOT NULL,
      retailer_product_id TEXT NOT NULL,
      cross_retailer_id TEXT,
      gtin_format INTEGER

      value INTEGER NOT NULL,

      name TEXT NOT NULL,
      brand TEXT,
      url TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,

      FOREIGN_KEY retailer REFERENCES retailers (id),
      FOREIGN_KEY value REFERENCES value_at_time (id),
      PRIMARY KEY (retailer, retailer_product_id),
      CHECK ((cross_retailer_id IS NOT NULL AND gtin_format IS NOT NULL) OR cross_retailer_id IS NULL)
    );


  `);
}
