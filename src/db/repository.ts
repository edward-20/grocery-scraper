import { Pool } from "pg";
import * as z from "zod";
import { CategoryScrapeId, RetailerName, UpdateProductFields, CategoryPath, RunId, RetailerScrapeId, CategoryId } from "../types.js";
import { CategoryCreateError, CategoryScrapeCreateError, CategoryScrapeWriteError, ProductCreateOrUpdateError, RetailerScrapeCreateError, RetailerScrapeWriteError, ScrapeRunCreateError, ScrapeRunWriteError } from "./errors.js";

export interface Category {
  retailerDesignatedCategoryId: string;
  name: string;
  path: string;
}

export const UnitSchema = z.union([
  z.literal("Each"), z.literal("Kg"), z.literal("g"), z.literal("L"), z.literal("mL"), z.literal("SS"), z.literal("sheets"), z.literal("m"), z.literal("kgM")
])
export type Unit = z.infer<typeof UnitSchema>

export const ValueAtTimeSchema = z.union([
  z.object({
    unitPrice: z.number(),
    unitPriceQuantity: z.number(),
    unitPriceUnit: UnitSchema,

    size: z.string(),
    price: z.number()
  }),
  z.object({
    size: z.string(),
    price: z.number()
  })
])
export type ValueAtTime = z.infer<typeof ValueAtTimeSchema>;

export const ProductSchema = z.object({
  retailerProductId: z.string(),

  crossRetailerId: z.string().optional(),
  gtinFormat: z.number().optional(),

  currentValue: ValueAtTimeSchema,

  name: z.string(),
  brand: z.string().optional(),
  path: z.string(),
  description: z.string(),
  image_url: z.string().optional(),
});
export const ProductsSchema = z.array(ProductSchema);

export type Product = z.infer<typeof ProductSchema>;

export type ProductId = number;

export interface Product_Category_Link {
  categoryId: number,
  productId: number,
}

export type ScrapeRun = {
  id: number;
  startedAt: Date;
  finishedAt?: Date;
  status: "running" | "completed";
  errors: number;
  errorMessage?: string;

  productsScraped?: number;
  newProductsAdded?: number,
  retailersAttempted?: number;
}

export class GroceryRepository {
  /*
  *
  * A repository is a programming pattern/class whose job is to hide the database details from the rest of your application.
  * possibly subdivide this into product related and system related
  */
  constructor(private readonly pool: Pool) {}

  /* ****************Scrape Runs************** */
  createRun(): ScrapeRun {
    throw new ScrapeRunCreateError();
  }

  finishRun(runId: RunId, errorMessage?: string): ScrapeRun {
    throw new ScrapeRunWriteError(runId);
  }

  markRunFailed(runId: RunId, errorMessage: string) {
    throw new ScrapeRunWriteError(runId);
  }

  /* ****************Retailer Scrape************** */
  createRetailerScrape(runId: RunId, retailer: RetailerName): RetailerScrapeId {
    throw new RetailerScrapeCreateError(runId, retailer);
  }

  finishRetailerScrape(retailerScrapeId: RetailerScrapeId) {
    throw new RetailerScrapeWriteError(retailerScrapeId);
  }

  markRetailerScrapeFailed(retailerScrapeId: RetailerScrapeId, errorMessage: string) {
    throw new RetailerScrapeWriteError(retailerScrapeId);
  }

  // internal? down the hierarchy?
  updateCategoriesScraped(retailerScrapeId: RetailerScrapeId, categoriesScraped: number) {
    throw new RetailerScrapeWriteError(retailerScrapeId);
  }

  updateProductsScraped(retailerScrapeId: RetailerScrapeId, productsScraped: number) {
    throw new RetailerScrapeWriteError(retailerScrapeId);
  }

  /* ****************Category Scrape************** */
  createCategoryScrape(retailerScrapeId: RetailerScrapeId, category: Category, categoryId: CategoryId): CategoryScrapeId {
    throw new CategoryScrapeCreateError(retailerScrapeId, category, categoryId);
  }

  finishCategoryScrape(categoryScrapeId: CategoryScrapeId) {
    throw new CategoryScrapeWriteError(categoryScrapeId);
  }

  markCategoryScrapeFailed(categoryScrapeId: CategoryScrapeId, errorMessage: string) {
    throw new CategoryScrapeWriteError(categoryScrapeId);
  }

  updateTotalProductsScraped(categoryScrapeId: CategoryScrapeId, productsScraped: number) {
    throw new CategoryScrapeWriteError(categoryScrapeId);
  }

  updateTotalNewProductsFound(categoryScrapeId: CategoryScrapeId, newProductsFound: number) {
    throw new CategoryScrapeWriteError(categoryScrapeId);
  }

  /* ****************Categories************** */
  // needs to be idempotent
  createOrFindCategory(category: Category, retailerName: RetailerName) : CategoryId {
    // need to find the coles retailer id
    throw new CategoryCreateError(category, "Coles");
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
      throw new ProductCreateOrUpdateError(product, categoryScrapeId);
    } finally {
      client.release();
    }
    return productId;
  }
}

