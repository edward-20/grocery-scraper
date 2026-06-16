import { RetailerScraper, Category } from "./retailerScraper.js";
import { Product } from "./retailerScraper.js";
import { Page } from "playwright";
import * as z from "zod";

const WoolworthsCategoriesPayload = z.array(z.object({
  NodeId: z.string(), // maps to retailerDesignatedCategoryId
  Description: z.string(),  // maps to name
  UrlFriendlyName: z.string(),
}))

export class WoolworthsScraper extends RetailerScraper {
  async discoverCategories(page: Page): Promise<Category[]> {
    const response = await page.goto("https://woolworths.com.au/apis/ui/PiesCategoriesWithSpecials");

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    // find the page count of each category??? map?
    return categories;
  }

  findPageCountForCategoryScrape(page: Page, category: Category) : number {

    throw new Error("Not implemented");
  }

  scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]> {
    throw new Error("Not implemented");
  }

  private parseCategoriesJSON(json: JSON) : Category[] {
    const categories = WoolworthsCategoriesPayload.parse(json);

    return categories.map((category) => ({
      retailerDesignatedCategoryId: category.NodeId,
      name: category.Description,
      path: category.UrlFriendlyName,
      pages: 0
    }))
  }

}
