import { RetailerName, RetailerScrapeConfig } from "../types.js";

export class UndefinedRetailerForCategoryCreationError extends Error {
  constructor(retailerName: RetailerName) {
    super(`Can't create category for retailer: ${retailerName}`);

    this.name = "UndefinedRetailerForCategoryCreationError";

    // Fix prototype chain (important when targeting ES5)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UndefinedRetailerForScraperCreationError extends Error {
  constructor(retailer: RetailerScrapeConfig) {
    super(`Unknown retailer: ${retailer.name}`)
    this.name = "UndefinedRetailerForScraperCreation";

    // Fix prototype chain (important when targeting ES5)
    Object.setPrototypeOf(this, new.target.prototype);
  }

}
