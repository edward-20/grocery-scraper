export type RetailerName = "woolworths" | "coles";

type MeasureUnit = "kg" | "g" | "ea" | "l";

export interface RetailerConfig {
  name: RetailerName;
  enabled: boolean;
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
  retailers: RetailerConfig[];
}

export interface ProductCore {
  retailer: RetailerName;
  retailerProductId: string;
  crossRetailerId?: string,
  price: number;
  unitPricing: {
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
    minimumQuantity: number;
  }
  name: string;
  brand: string;
  url?: string;
  description: string;
  imageUrl?: string;
}

export interface ProductSnapshot {
  core: ProductCore;
  raw: unknown;
  status: "ok" | "error";
  errorMessage?: string;
}

export interface ScrapeRun {
  id: number;
  retailer: RetailerName;
}
