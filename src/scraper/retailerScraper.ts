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
  currentValue: ValueAtTime; 
  name: string;
  brand?: string;
  path: string;
  description: string;
  image_url?: string;
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

export abstract class RetailerScraper {
  protected abstract retailerUrl : string;
  constructor(retailerConfig: RetailerScrapeConfig) {
    // use the config to customise implementation, e.g. productByProduct (means
    // more scrape product by product)
  }

  abstract discoverCategories(page: Page): Promise<Category[]>; // Category type should supply information to be able to fulfill a row of Categories and categoryScrape

  abstract findPageCountForCategoryScrape(page: Page, category: Category) : Promise<number>;

  abstract scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]>;

  // this is really only applicable to the coles website because I can't extract
  // the variants unless we used the url of a single product page, maybe there
  // can be a RetailerScrapeConfig flag asking for detailed or non-detailed 
  // abstract scrapeSingleProduct(page: Page, category: Category, product: SingleProduct) : Promise<Product>;
}
