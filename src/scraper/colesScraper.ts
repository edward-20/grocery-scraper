import { RetailerScraper, Category } from "./retailerScraper.js";
import { Product } from "./retailerScraper.js";
import { Page } from "playwright";

// stubbed
export class ColesScraper extends RetailerScraper {
  discoverCategories(page: Page): Promise<Category[]> {
    throw new Error("Not implemented");
  }

  findPageCountPerCategory(page: Page, category: Category) : number {
    throw new Error("Not implemented");
  }

  scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]> {
    throw new Error("Not implemented");
  }
}
