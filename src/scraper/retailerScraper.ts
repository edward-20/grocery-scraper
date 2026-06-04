import type { Page } from "playwright";
import { Product, RetailerConfig, RetailerName } from "../types.js";

// need to flesh out what the Category interface is (refer to JSON of each
// retailer)
export interface Category {
  name: string,
  url: string,
  pages: number
}

// also a tentative definition
export interface SingleProduct {
  name: string,
  url: string
}

export abstract class RetailerScraper {
  constructor(retailerConfig: RetailerConfig) {}
  discoverCategories(page: Page): Promise<string[]>;
  findPageCountPerCategory(page: Page, category: Category) : number;
  scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]>;
  // this is really only applicable to the coles website because I can't extract
  // the variants unless we used the url of a single product page, maybe there
  // can be a RetailerConfig flag asking for detailed or non-detailed 
  scrapeSingleProduct(page: Page, category: Category, product: SingleProduct) : Promise<Product>;
}
