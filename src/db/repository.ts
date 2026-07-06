import { Pool } from "pg";
import { CategoryScrapeId, RetailerName, UpdateProductFields, CategoryPath, RunId, RetailerScrapeId, CategoryId } from "../types.js";

export interface Category {
  retailerDesignatedCategoryId: string;
  name: string;
  path: string;
  retailerDesignatedProductCount?: number;
}

// what do we need from the Product returned by scrapeProductsOfCategoryPage in
// order to make changes to the repository
export interface Product {
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

export type ProductId = number;

export interface Product_Category_Link {
  categoryId: number,
  productId: number,
}

export type Unit ="Each" | "Kg" | "g" | "L" | "mL" | "SS" | "sheets";
export type ValueAtTime = {
  unitPrice: number;
  unitPriceQuantity: number;
  unitPriceUnit: Unit;

  size: string;
  price: number;
} | {
  size: string;
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
  async createOrUpdateProduct(product: Product, categoryScrapeId: number) : Promise<ProductId> {
    /*
      If new
      1. create or find product
      2. create value_at_time and link to product
      3. edit product to have its current_value_id point to the new value_at_time row just created 
      4. create a row in product_categories to show that the product belongs to that category
    */
    let productId: ProductId;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN;');

      // 1.
      // how to account for optional values?
      const productInsertResult = await client.query<{id: number}>('INSERT INTO products (\
        retailer_product_id,\
        cross_retailer_id,\
        gtin_format,\
        name,\
        brand,\
        path,\
        description,\
        image_url\
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)\
      ON CONFLICT (retailer_product_id) DO UPDATE\
      SET\
        cross_retailer_id = EXCLUDED.cross_retailer_id\
        gtin_format = EXCLUDED.gtin_format\
        name = EXCLUDED.name\
        brand = EXCLUDED.brand\
        path = EXCLUDED.path\
        desciption = EXCLUDED.desciption\
        image_url = EXCLUDED.image_url\
      RETURN id;', [
        product.retailerProductId,
        product.crossRetailerId ?? null,
        product.gtinFormat ?? null,
        product.name,
        product.brand ?? null,
        product.path,
        product.description,
        product.image_url ?? null
      ]);

      // 2.
      productId = productInsertResult.rows[0].id;
      const valueAtTimeInsertResult = await client.query<{id: number}>('INSERT INTO value_at_time (\
        product_id,\
        category_scrape_id,\
        unit_price,\
        unit_price_quantity\
        unit_price_unit_of_measurement,\
        size,\
        price,\
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)\
      RETURNING id;', [
          productId,
          categoryScrapeId,
          product.currentValue.unitPrice,
          product.currentValue.unitPriceQuantity,
          product.currentValue.unitPriceUnit,
          product.currentValue.size,
          product.currentValue.price
      ]);

      // 3.
      const valueAtTimeId = valueAtTimeInsertResult.rows[0].id;
      await client.query('UPDATE products SET current_value_id = $1 WHERE id = $2', [valueAtTimeId, productId])

      // 4.
      const categorySelectResult = await client.query<{category_id: number}>('SELECT category_id FROM category_scrapes WHERE id = $1', [categoryScrapeId]);
      const categoryId = categorySelectResult.rows[0].category_id;
      await client.query('INSERT INTO product_categories (product_id, category_id) VALUES (\
        $1,\
        $2)\
        ON CONFLICT DO NOTHING', [productId, categoryId])
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return productId;
  }

  updateProduct(productId: ProductId, updateProductFields: UpdateProductFields) : ProductId {
    throw new Error("Not implemented");
  }
}

