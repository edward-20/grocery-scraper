import { Pool } from "pg";
import { Product, ProductId, CategoryScrapeId, RetailerName, UpdateProductFields, ValueAtTime, CategoryPath, RunId, RetailerScrapeId, ValueAtTimeId } from "../types.js";

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

  // internal? down the hierarchy?
  // updateProductsScraped() {
  //   throw new Error("Not implemented");
  // }

  // internal? down the hierarchy?
  updateNewProducts() {
    throw new Error("Not implemented");
  }

  // internal? down the hierarchy?
  updateRetailersAttempted() {
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
  createCategoryScrape(retailerScrapeId: RetailerScrapeId, categoryId: CategoryId, name: string, path: string): CategoryScrapeId {
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
  createColesCategory(path: CategoryPath, name: string, retailerDesignatedId: string, retailerDesignatedProductCount?: number) {
    // need to find the coles retailer id
    throw new Error("Not implemented");
  }

  createWoolworthsCategory(path: CategoryPath, name: string, retailerDesignatedId: string, retailerDesignatedProductCount?: number) {
    // need to find the woolworths retailer id
    throw new Error("Not implemented");
  }

  updateCategory(categoryId: CategoryId, path?: CategoryPath, name?: string, retailerDesignatedProductCount?: number) {
    throw new Error("Not implemented");
  }

  /* ****************Products************** */
  createProduct(product: Product) : ProductId {
    // need to find the coles retailer id
    throw new Error("Not implemented");
  }

  updateProduct(productId: ProductId, updateProductFields: UpdateProductFields) : ProductId {
    throw new Error("Not implemented");
  }

  /* ****************Value at Time************** */
  createValueAtTime(valueAtTime: ValueAtTime) : ValueAtTimeId {
    throw new Error("Not implemented");
  }
}

