import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import YAML from "yaml";
import type { RetailerName, ScraperConfig } from "../types.js";

const retailerNames = new Set<RetailerName>(["woolworths", "coles"]);

type ConfigInput = {
  database?: {
    path?: string;
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
    targets?: Array<{
      name?: string;
      url?: string;
      maxPages?: number;
      maxProducts?: number;
    }>;
  }>;
};

export function loadConfig(configPath = "config/scraper.yaml"): ScraperConfig {
  const absolutePath = resolve(configPath);
  const parsed = YAML.parse(readFileSync(absolutePath, "utf8")) as ConfigInput;
  return validateConfig(parsed, absolutePath);
}

export function validateConfig(config: ConfigInput, source = "config"): ScraperConfig {
  if (!config.database?.path) {
    throw new Error(`${source}: database.path is required`);
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
    if (!Array.isArray(retailer.targets)) {
      throw new Error(`${source}: retailers[${retailerIndex}].targets must be an array`);
    }

    return {
      name: retailer.name,
      enabled: retailer.enabled ?? true,
      targets: retailer.targets.map((target, targetIndex) => {
        if (!target.name) {
          throw new Error(`${source}: retailers[${retailerIndex}].targets[${targetIndex}].name is required`);
        }
        if (!target.url) {
          throw new Error(`${source}: retailers[${retailerIndex}].targets[${targetIndex}].url is required`);
        }
        new URL(target.url);
        return {
          name: target.name,
          url: target.url,
          maxPages: numberOrDefault(target.maxPages, 1, "target.maxPages"),
          maxProducts: numberOrDefault(target.maxProducts, 25, "target.maxProducts"),
        };
      }),
    };
  });

  return {
    database: { path: config.database.path },
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
