import { RetailerScraper } from "./retailerScraper.js";
import { Product, Category } from "../db/repository.js";
import { Page } from "playwright";

// stubbed
export class ColesScraper extends RetailerScraper {
  protected retailerUrl = "https://coles.com.au"

  discoverCategories(page: Page): Promise<Category[]> {
    throw new Error("Not implemented");
  }

  scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    throw new Error("Not implemented");
  }
}
