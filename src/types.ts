export type RetailerName = "Woolworths" | "Coles";

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


export interface Product {
  categoryId: number;
  retailerProductId: string;

  crossRetailerId?: string;
  gtinFormat?: number;
  currentValue: number; 
  name: string;
  brand?: string;
  path: string;
  description: string;
  image_url?: string;
}

export interface UpdateProductFields {
  name?: string;
}

export interface ValueAtTime {
  productId: number;
  categoryScrapeId: number;

  unitPrice: number;
  unitPriceQuantity: number;
  unitPriceMeasureQuantity: number;
  unitPriceUnit: "Each" | "Kg" | "g" | "L" | "mL" | "SS";

  sizeUnit: "Each" | "Kg" | "g" | "L" | "mL" | "SS";
  sizeQuantity: number;
  sizeQuantityMin: number;
  price: number;
}

export type RunId = number;
export type RetailerScrapeId = number;

export type CategoryScrapeId = number;
export type CategoryId = number;
export type CategoryPath = string;  // enforce stricter maybe later on

export type ProductId = string;

export type ValueAtTimeId = string;
