export type RetailerName = "woolworths" | "coles";

type MeasureUnit = "kg" | "g" | "ea" | "l";

// config
export interface RetailerScrapeConfig {
  name: RetailerName;
  enabled: boolean;
  detailedEnabled: boolean;
}

export interface ScraperConfig {
  database: {
    path: string;
  };
  schedule: {
    cron: string;
  };
  browser: {
    headless: boolean;
  };
  scrape: {
    throttleMs: number;
    navigationTimeoutMs: number;
  };
  retailers: RetailerScrapeConfig[];
}

// System Logging for database (analytics)
export interface ScrapeRun {
  id: number;
  productsScanned: number;
  newProductsAdded: number;
  retailerSummaries: Record<RetailerConfig["name"], RetailerSummary>
  errors: number;
  timeStarted: Date;
  timeEnded: Date | null;
}

// common denominator fields but can be extended for retailer specific details
export interface RetailerSummary {
  categories: Record<Category, CategorySummary>;
  timeStarted: Date;
  timeEnded: Date | null;
}

// what do you want to know about the efforts to scrape a category of a retailer
export interface CategorySummary {
  name: string; 
  url: string;
  pages: number;
  successfulPageScrapes: number;
  totalProductsScrapped: number;
  totalNewProductsAdded: number;
  productsChangedInPricing: number;
  failedToScrapeProducts: Product[];
}

// Data Logging for database (actual data we care about)
export interface ValueAtTime {
  price: number,
  unit: {
    price: number;
    cupMeasure: {
      quantity: number;
      ofMeasureQuantity: number;
      ofMeasureUnits: MeasureUnit;
    }
  },
  size: {
    unit: MeasureUnit;
    quantity: number | { mimimumQuantity: number, maximumQuantity: number }; // can be a range for produce products
  },
  // foreign keys
  retailerProductId: string
  time: Date,
  run: number
}

export interface Product {
  retailer: RetailerName;
  retailerProductId: string;
  crossRetailerId?: string,
  name: string;
  brand: string;
  url?: string;
  description: string;
  imageUrl?: string;
}

