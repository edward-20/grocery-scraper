import type { Page } from "playwright";

import type { RetailerScrapeConfig } from "../types.js"

import { Product, Category } from "../db/repository.js";

export abstract class RetailerScraper {
  protected abstract retailerUrl : string;
  constructor(retailerConfig: RetailerScrapeConfig) {
    // use the config to customise implementation, e.g. productByProduct (means
    // more scrape product by product)
  }

  abstract discoverCategories(page: Page): Promise<Category[]>; // Category type should supply information to be able to fulfill a row of Categories and categoryScrape

  abstract scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]>;

  // this is really only applicable to the coles website because I can't extract
  // the variants unless we used the url of a single product page, maybe there
  // can be a RetailerScrapeConfig flag asking for detailed or non-detailed 
  // abstract scrapeSingleProduct(page: Page, category: Category, product: SingleProduct) : Promise<Product>;
}
