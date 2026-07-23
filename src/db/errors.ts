// A repository should expose errors that make sense in terms of its contract,
// not in terms of its implementation
// Think about if you changed the implementation, would you have to change the
// error class names. What code depending on this repository would have to
// change?

// Errors should be expressed in the language of the abstraction, which is
// sometimes the same as the domain.

// What failures can callers reasonably react to? Only create a specific error
// class if callers are expected to handle it differently
// DuplicateProductError, RepositoryUnavailableError

import { CategoryId, RetailerName } from "../types.js";
import { Product, Category } from "./repository.js";
import { RetailerScrapeId } from "../types.js";
import { RunId } from "../types.js";

// needs to hold details regarding what happened with the database. Further
// research required on how to grab this info

/* ****************Categories************** */
export class CategoryCreateError extends Error {
  constructor(category: Category, retailerName: RetailerName) {
    super(`Error with creating category: ${category.name} for retailer: ${retailerName}`);
    this.name = "CategoryCreateError";
  }
}

/* ****************Products************** */
export class ProductCreateOrUpdateError extends Error {
  constructor(product: Product, categoryScrapeId: number) {
    super(`Error with creating product: ${product.name} for category scrape: ${categoryScrapeId}`);
    this.name = "ProductCreateOrUpdateError";
  }
}

/* ****************Category Scrape************** */
export class CategoryScrapeCreateError extends Error {
  constructor(retailerScrapeId: RetailerScrapeId, category: Category, categoryId: CategoryId) {
    super(`Error with creating a category_scrape: retailer scrape id: ${retailerScrapeId}, category: ${category.name}`);
    this.name = "CategoryScrapeCreateError";
  }
}

export class CategoryScrapeWriteError extends Error {
  categoryScrapeId: number;
  constructor(categoryScrapeId: number) {
    super(`Error with writing to category_scrapes: ${categoryScrapeId}`);
    this.categoryScrapeId = categoryScrapeId;
    this.name = "CategoryScrapeWriteError";
  }
}

/* ****************Retailer Scrape************** */
export class RetailerScrapeCreateError extends Error {
  constructor(runId: RunId, retailer: RetailerName) {
    super(`Error with creating a retailer_scrape: runId: ${runId}, retailer: ${retailer}`);
    this.name = "RetailerScrapeCreateError";
  }
}

export class RetailerScrapeWriteError extends Error {
  constructor(retailerScrapeId: RetailerScrapeId) {
    super(`Error with writing to retailer_scrapes: ${retailerScrapeId}`);
    this.name = "RetailerScrapeWriteError";
  }
}

/* ****************Scrape Runs************** */
export class ScrapeRunCreateError extends Error {
  constructor() {
    super(`Error with creating a scrape run`);
    this.name = "ScrapeRunCreateError";
  }
}

export class ScrapeRunWriteError extends Error {
  constructor(runId: RunId) {
    super(`Error with writing to scrape_runs: ${runId}`);
    this.name = "ScrapeRunWriteError";
  }
}
