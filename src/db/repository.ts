import { Pool } from "pg";
import { ProductId, CategoryScrapeId, RetailerName, UpdateProductFields, CategoryPath, RunId, RetailerScrapeId, CategoryId } from "../types.js";

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
  categoryId: string;
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

export type Unit ="Each" | "Kg" | "g" | "L" | "mL" | "SS"; 
export interface ValueAtTime {
  unitPrice: number;
  unitPriceQuantity: number;
  unitPriceMeasureQuantity: number;
  unitPriceUnit: Unit;

  sizeUnit: Unit;
  sizeQuantity: number;
  sizeQuantityMin: number;
  price: number;
}
export class GroceryRepository {
  /*
  *
  * A repository is a programming pattern/class whose job is to hide the database details from the rest of your application.
  * possibly subdivide this into product related and system related
  */
  constructor(private readonly pool: Pool) {}

  /* ****************Scrape Runs************** */
  createRun(): RunId {
    throw new Error("Not implemented");
  }

  finishRun(runId: RunId, errorMessage?: string): RunId {
    throw new Error("Not implemented");
  }

  runEncounteredError(runId: RunId, errorMessage: string) {
    throw new Error("Not implemented");
  }

  /* ****************Retailer Scrape************** */
  createRetailerScrape(runId: RunId, retailer: RetailerName): RetailerScrapeId {
    throw new Error("Not implemented");
  }

  finishRetailerScrape(retailerScrapeId: RetailerScrapeId) {
    throw new Error("Not implemented");
  }

  retailerScrapeEncounteredError(retailerScrapeId: RetailerScrapeId, errorMessage: string) {
    throw new Error("Not implemented");
  }

  caughtInScrapeTrap(retailerScrapeId: RetailerScrapeId) {
    throw new Error("Not implemented");
  }

  // internal? down the hierarchy?
  updateCategoriesScraped(retailerScrapeId: RetailerScrapeId, categoriesScraped: number) {
    throw new Error("Not implemented");
  }

  updateProductsScraped(retailerScrapeId: RetailerScrapeId, productsScraped: number) {
    throw new Error("Not implemented");
  }

  /* ****************Category Scrape************** */
  createCategoryScrape(retailerScrapeId: RetailerScrapeId, category: Category): CategoryScrapeId {
    throw new Error("Not implemented");
  }

  finishCategoryScrape(categoryScrapeId: CategoryScrapeId) {
    throw new Error("Not implemented");
  }

  categoryScrapeErrorEncountered(categoryScrapeId: CategoryScrapeId, errorMessage: string) {
    throw new Error("Not implemented");
  }

  updatePages(categoryScrapeId: CategoryScrapeId, pages: number) {
    throw new Error("Not implemented");
  }

  updateSuccessfulPageScrapes(categoryScrapeId: CategoryScrapeId, successfulPageScrapes: number) {
    throw new Error("Not implemented");
  }

  updateTotalProductsScraped(categoryScrapeId: CategoryScrapeId, productsScraped: number) {
    throw new Error("Not implemented");
  }

  updateTotalNewProductsFound(categoryScrapeId: CategoryScrapeId, newProductsFound: number) {
    throw new Error("Not implemented");
  }

  /* ****************Categories************** */
  // needs to be idempotent
  createColesCategory(category: Category) : CategoryId {
    // need to find the coles retailer id
    throw new Error("Not implemented");
  }

  // needs to be idempotent
  createWoolworthsCategory(category: Category) : CategoryId {
    // need to find the woolworths retailer id
    throw new Error("Not implemented");
  }

  updateCategory(categoryId: CategoryId, path?: CategoryPath, name?: string, retailerDesignatedProductCount?: number) {
    throw new Error("Not implemented");
  }

  /* ****************Products************** */
  createOrUpdateProduct(product: Product, categoryScrapeId: number) : ProductId {
    /*
      If new
      1. create product
      2. create value_at_time and link to product
      3. edit product to have its current_value_id point to the new value_at_time row just created 
      If exists
      1. find product (by retailer_product_id)
      2. if things other than the price or unit_price have changed then create a new product?
      2. create value_at_time and link to product
      3. edit product to have its current_value_id point to the new value_at_time row just created 
    */
    //
    throw new Error("Not implemented");
  }

  updateProduct(productId: ProductId, updateProductFields: UpdateProductFields) : ProductId {
    throw new Error("Not implemented");
  }
}

