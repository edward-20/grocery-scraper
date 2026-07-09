import { RetailerScraper } from "./retailerScraper.js";
import { Product, Category } from "../db/repository.js";
import * as z from "zod";
import { Page } from "playwright";

const ColesCategoriesPayload = z.object({});

export const ColesProductsPagePayload = z.object({})
// stubbed
export class ColesScraper extends RetailerScraper {
  protected retailerUrl = "https://www.coles.com.au"

  discoverCategories(page: Page): Promise<Category[]> {
    throw new Error("Not implemented");
  }

  scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    throw new Error("Not implemented");
  }
}
