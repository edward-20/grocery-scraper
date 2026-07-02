import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import type { RetailerName, ScraperConfig } from "../types.js";

const retailerNames = new Set<RetailerName>(["Woolworths", "Coles"]);

type ConfigInput = {
  database?: {
    host?: string,
    port?: number,
    database?: string,
    user?: string,
    password?: string
  };
  schedule?: {
    cron?: string;
  };
  browser?: {
    headless?: boolean;
  };
  scrape?: {
    throttleMs?: number;
    navigationTimeoutMs?: number;
  };
  retailers?: Array<{
    name?: RetailerName;
    enabled?: boolean;
    productByProduct?: boolean;
  }>;
};

export function loadConfig(configPath = "config/scraper.yaml"): ScraperConfig {
  const absolutePath = resolve(configPath);
  const parsed = YAML.parse(readFileSync(absolutePath, "utf8")) as ConfigInput;
  return validateConfig(parsed, absolutePath);
}

export function validateConfig(config: ConfigInput, source = "config"): ScraperConfig {
  if (!config.database?.host) {
    throw new Error(`${source}: database.host is required`);
  }
  if (!config.database?.port) {
    throw new Error(`${source}: database.port is required`);
  }
  if (!config.database?.database) {
    throw new Error(`${source}: database.database is required`);
  }
  if (!config.database?.user) {
    throw new Error(`${source}: database.user is required`);
  }
  if (!config.database?.password) {
    throw new Error(`${source}: database.password is required`);
  }

  if (!config.schedule?.cron) {
    throw new Error(`${source}: schedule.cron is required`);
  }

  const headless = config.browser?.headless ?? true;
  const throttleMs = numberOrDefault(config.scrape?.throttleMs, 1500, "scrape.throttleMs");
  const navigationTimeoutMs = numberOrDefault(
    config.scrape?.navigationTimeoutMs,
    45000,
    "scrape.navigationTimeoutMs",
  );

  if (!Array.isArray(config.retailers) || config.retailers.length === 0) {
    throw new Error(`${source}: at least one retailer is required`);
  }

  const retailers = config.retailers.map((retailer, retailerIndex) => {
    if (!retailer.name || !retailerNames.has(retailer.name)) {
      throw new Error(`${source}: retailers[${retailerIndex}].name must be woolworths or coles`);
    }

    return {
      name: retailer.name,
      enabled: retailer.enabled ?? true,
      productByProduct: retailer.productByProduct ?? false
    };
  });

  return {
    database: { 
      host: config.database.host,
      port: config.database.port,
      database: config.database.database,
      user: config.database.user,
      password: config.database.password,
    },
    schedule: { cron: config.schedule.cron },
    browser: { headless },
    scrape: { throttleMs, navigationTimeoutMs },
    retailers,
  };
}

function numberOrDefault(value: unknown, fallback: number, field: string): number {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number`);
  }
  return value;
}
