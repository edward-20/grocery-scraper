PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS unit_of_measurement (
  unit TEXT PRIMARY KEY NOT NULL 
);

INSERT INTO unit_of_measurement ("Each", "Kg", "g", "L", "mL");

-- domain data
CREATE TABLE IF NOT EXISTS retailers (
  name TEXT PRIMARY KEY NOT NULL,
  total_products INTEGER DEFAULT 0
);
INSERT INTO retailers(name) VALUES ('woolworths', 'coles');

CREATE TABLE IF NOT EXISTS categories (
  retailer TEXT NOT NULL,
  retailer_designated_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  retailer_designated_product_count INTEGER DEFAULT NULL, -- this pertains to coles, who has this data in their json
 
  FOREIGN KEY retailer REFERENCES retailers(name)
);

CREATE TABLE IF NOT EXISTS products (
  retailer INTEGER NOT NULL,
  retailer_product_id TEXT NOT NULL,
  cross_retailer_id TEXT,
  gtin_format INTEGER

  current_value INTEGER NOT NULL,

  name TEXT NOT NULL,
  brand TEXT,
  path TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,

  FOREIGN KEY retailer REFERENCES retailers (name),
  FOREIGN KEY value REFERENCES value_at_time (id),
  PRIMARY KEY (retailer, retailer_product_id),
  CHECK ((cross_retailer_id IS NOT NULL AND gtin_format IS NOT NULL) OR cross_retailer_id IS NULL)
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
  unit_price_unit TEXT NOT NULL,

  -- size and price of the product
  size_unit TEXT NOT NULL,
  size_quantity REAL,
  size_quantity_min REAL,
  size_quantity_max REAL,
  price REAL NOT NULL,

  time TEXT NOT NULL,

  run INTEGER NOT NULL,

  FOREIGN KEY (retailer, retailer_product_id) REFERENCES products (retailer, retailer_product_id),
  FOREIGN KEY (unit_price_unit) REFERENCES unit_of_measurement (unit),
  FOREIGN KEY (size_unit) REFERENCES unit_of_measurement (unit),
  FOREIGN KEY (run) REFERENCES scrape_runs (id),

  CHECK (
	(size_quantity is NOT NULL AND size_quantity_min IS NULL AND size_quantity_max is NULL)
	OR
	(size_quantity is NULL AND size_quantity_min IS NOT NULL AND size_quantity_max is NOT NULL)
  )
);

-- analytic/operational data 
CREATE TABLE IF NOT EXISTS scrape_runs (
  -- primary keys and references
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- basic scrape fields
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT "running" CHECK (
	status IN ("running", "completed")
  ),
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  -- analytics (everything in analytics down is up to your discernment)
  products_scraped INTEGER,
  new_products_added INTEGER,
  retailers_attempted INTEGER, -- maybe
);

CREATE TABLE IF NOT EXISTS retailer_scrapes (
  -- primary keys and references
  scrape_run INTEGER NOT NULL,
  retailer TEXT NOT NULL,
  scrape_trapped INTEGER NOT NULL DEFAULT FALSE CHECK(
	scrape_trapped IN (FALSE, TRUE)
  ),

  -- basic scrape fields
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT "running" CHECK (
	status IN ("running", "completed")
  ),
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  -- analytics
  categories_scraped INTEGER,
  products_scraped INTEGER,

  FOREIGN KEY scrape_run REFERENCES scrape_runs(id),
  FOREIGN KEY retailer REFERENCES retailers(name),
  PRIMARY KEY (scrape_run, retailer)
);

CREATE TABLE IF NOT EXISTS category_scrapes (
  -- primary keys and references
  scrape_run INTEGER NOT NULL,
  retailer TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  -- basic scrape fields
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  status TEXT NOT NULL DEFAULT "running" CHECK (
	status IN ("running", "completed")
  ),
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  -- analytics
  pages INTEGER DEFAULT NULL,
  successful_page_scrapes INTEGER NOT NULL DEFAULT 0,
  total_products_scrapped INTEGER NOT NULL DEFAULT 0,
  total_new_products_found INTEGER NOT NULL DEFAULT 0,

  FOREIGN KEY (scrape_run) REFERENCES retailer_scrapes (scrape_run),
  FOREIGN KEY (retailer) REFERENCES retailer_scrapes (retailer),
  PRIMARY KEY (scrape_run, retailer, path)
);
