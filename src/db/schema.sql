BEGIN;

-- enums
CREATE TYPE IF NOT EXISTS unit_of_measurement AS ENUM (
  "Each", "Kg", "g", "L", "mL", "SS" 
);

-- domain data
CREATE TABLE IF NOT EXISTS retailers (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  name TEXT NOT NULL UNIQUE,
  total_products INTEGER DEFAULT 0,
  url TEXT NOT NULL UNIQUE
);
INSERT INTO retailers (name, url) VALUES ('Woolworths', 'https//:woolworths.com.au') ('Coles', 'https://coles.com.au');

CREATE TABLE IF NOT EXISTS categories (
  -- natural keys and surrogate id
  retailer_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  retailer_designated_id TEXT NOT NULL,
  name TEXT NOT NULL,
  retailer_designated_product_count INTEGER DEFAULT NULL, -- this pertains to coles, who has this data in their json
 
  FOREIGN KEY retailer_id REFERENCES retailers(id),
  UNIQUE (retailer_id, path)
);

CREATE TABLE IF NOT EXISTS products (
  -- natural keys and surrogate id
  category_id INTEGER NOT NULL,
  retailer_product_id TEXT NOT NULL,
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  cross_retailer_id TEXT,
  gtin_format INTEGER,
  current_value INTEGER NOT NULL,
  name TEXT NOT NULL,
  brand TEXT,
  path TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,

  FOREIGN KEY category_id REFERENCES categories (id),
  FOREIGN KEY current_value REFERENCES value_at_time (id),
  UNIQUE (category_id, retailer_product_id),
  CHECK ((cross_retailer_id IS NOT NULL AND gtin_format IS NOT NULL) OR (cross_retailer_id IS NULL AND gtin_format is NULL))
);

CREATE TABLE IF NOT EXISTS value_at_time (
  -- natural key (time, product_id), surrogate id and foreign key (category_scrape_id)
  product_id INTEGER NOT NULL,
  time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category_scrape_id INTEGER NOT NULL,
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY, -- think about scale, 365 days x 5 years x how many products

  -- unit price for comparison regardless of whether the product is discrete or non-discrete
  unit_price NUMERIC(6, 2) NOT NULL,
  -- <unit_price_quantity> of <unit_price_measure_quantity> <unit_price_unit>
  unit_price_quantity INTEGER NOT NULL, -- woolworths: 1 (by default), coles: pricing.unit.quantity
  unit_price_measure_quantity INTEGER NOT NULL, -- woolworths: CupMeasure (first part before alphanumeric), coles: pricing.unit.ofMeasureQuantity
  unit_price_unit unit_of_measurement NOT NULL, -- woolworths: CupMeasure (alphanumeric part), coles: pricing.unit.ofMeasureUnits

  -- size and price of the product
  size_unit unit_of_measurement NOT NULL, -- woolworths: PackageSize (unit part)
  size_quantity NUMERIC(6, 2) NOT NULL, -- woolworths: PackageSize (will not be a perfect number can be, "125g x 2 pack" "per 150g", "180g")
  size_quantity_min NUMERIC(6, 2) NOT NULL, -- woolworths: MinimumQuantity, coles: (doesn't have)
  price NUMERIC(6, 2) NOT NULL, -- woolworths: price, coles: pricing.now

  FOREIGN KEY (product_id) REFERENCES products (id),
  FOREIGN KEY (category_scrape_id) REFERENCES category_scrapes (id),
  UNIQUE (product_id, time)
) WITH (
  tsdb.hypertable,
);

-- analytic/operational data 
CREATE TABLE IF NOT EXISTS scrape_runs (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  -- basic scrape fields
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT "running" CHECK (
	status IN ("running", "completed")
  ),
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,

  -- analytics (everything in analytics down is up to your discernment)
  products_scraped INTEGER DEFAULT 0,
  new_products_added INTEGER DEFAULT 0,
  retailers_attempted INTEGER DEFAULT 0, -- maybe

  CHECK (finished_at IS NOT NULL AND status = "running" || finished_at = NULL AND status = "completed"),
  CHECK (started_at < finished_at)
);

CREATE TABLE IF NOT EXISTS retailer_scrapes (
  -- natural keys, surrogate id and foreign keys (natural keys just happen to be
  -- made from the foreign keys)
  scrape_run_id INTEGER NOT NULL,
  retailer TEXT NOT NULL,
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

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

  FOREIGN KEY scrape_run_id REFERENCES scrape_runs(id),
  FOREIGN KEY retailer REFERENCES retailers(name),
  UNIQUE (scrape_run_id, retailer),
  CHECK (finished_at IS NOT NULL AND status = "running" || finished_at = NULL AND status = "completed"),
  CHECK (started_at < finished_at)
);

CREATE TABLE IF NOT EXISTS category_scrapes (
  -- natural keys, surrogate id and foreign keys (natural keys just happen to be made from the
  -- foreign keys)
  retailer_scrape_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL, -- unique because its a foreign key to primary key
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  name TEXT NOT NULL,
  path TEXT NOT NULL,
  -- basic scrape fields
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
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

  FOREIGN KEY (retailer_scrape_id) REFERENCES retailer_scrapes (id),
  FOREIGN KEY (category_id) REFERENCES categories (id),
  CHECK (finished_at IS NOT NULL AND status = "running" || finished_at = NULL AND status = "completed"),
  CHECK (started_at < finished_at)
);

COMMIT;
