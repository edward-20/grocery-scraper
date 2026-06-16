import type { Page } from "playwright";

import type { RetailerScrapeConfig } from "../types.js"

export interface Category {
  retailerDesignatedCategoryId: string;
  name: string;
  path: string;
  pages: number;
  retailerDesignatedProductCount?: number;
}

// what do we need from the Product returned by scrapeProductsOfCategoryPage in
// order to make changes to the repository
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

export abstract class RetailerScraper {
  constructor(retailerConfig: RetailerScrapeConfig) {}

  abstract discoverCategories(page: Page): Promise<Category[]>; // should supply information to be able to fulfill a row of Categories and categoryScrape

  abstract findPageCountPerCategory(page: Page, category: Category) : number;

  abstract scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]>;

  // this is really only applicable to the coles website because I can't extract
  // the variants unless we used the url of a single product page, maybe there
  // can be a RetailerScrapeConfig flag asking for detailed or non-detailed 
  // abstract scrapeSingleProduct(page: Page, category: Category, product: SingleProduct) : Promise<Product>;
}
