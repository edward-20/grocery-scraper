export type RetailerName = "woolworths" | "coles";

type MeasureUnit = "kg" | "g" | "ea" | "l";

// config
export interface RetailerScrapeConfig {
  name: RetailerName;
  enabled: boolean;
  productByProduct: boolean;
}

export interface ScraperConfig {
  database: {
    host: string,
    port: number,
    database: string,
    user: string,
    password: string
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
  retailerSummaries: Record<RetailerName, RetailerSummary>
  errors: number;
  errorMessage?: string; // error has to be concerned with the scrape run level not the retailer, category or product
  startedAt: Date;
  finishedAt: Date | null;
  status: "running" | "completed"
}

export interface RetailerSummary {
  retailer: RetailerName;
  categories: CategorySummary[];
  scrapeTrapped: boolean;
  startedAt: Date;
  finishedAt: Date | null;
}

export interface CategorySummary {
  name: string; 
  slug: string;
  pages: number;
  successfulPageScrapes: number;
  errors: string; // tentative on the type, wait until we actually give it a real try to see what form errors take to specify a better error type 
  totalProductsScrapped: number;
  totalNewProductsAdded: number;
  failedToScrapeProducts?: ProductSummary[]; // only needed for detailed mode
}

export interface ProductSummary {
  name: string;
  retailer: RetailerName;
  retailerProductId: number;
  url: string;
  error: string; 
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

