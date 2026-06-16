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



export interface UpdateProductFields {
  name?: string;
}

export type RunId = number;
export type RetailerScrapeId = number;

export type CategoryScrapeId = number;
export type CategoryId = number;
export type CategoryPath = string;  // enforce stricter maybe later on

export type ProductId = string;

export type ValueAtTimeId = string;
