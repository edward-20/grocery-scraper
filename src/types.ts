export type RetailerName = "woolworths" | "coles";

export interface ScrapeTarget {
  name: string;
  url: string;
  maxPages: number;
  maxProducts: number;
}

export interface RetailerConfig {
  name: RetailerName;
  enabled: boolean;
  targets: ScrapeTarget[];
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
  retailerProductId?: string;
  url: string;
  name: string;
  brand?: string;
  imageUrl?: string;
  packageSize?: string;
  price?: number;
  unitPrice?: string;
  availability?: string;
  currency?: string;
}

export interface ProductSnapshot {
  core: ProductCore;
  raw: unknown;
  normalized: unknown;
  status: "ok" | "error";
  errorMessage?: string;
}

export interface ScrapeRun {
  id: number;
  retailer?: RetailerName;
  targetName?: string;
}
