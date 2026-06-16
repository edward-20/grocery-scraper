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
  protected retailerUrl = "https://woolworths.com.au"
  async discoverCategories(page: Page): Promise<Category[]> {
    const response = await page.goto(`${this.retailerUrl}/apis/ui/PiesCategoriesWithSpecials`);

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    // remove the category specials because its not mutually exclusive and the
    // process of scraping it page by page won't work
    return categories;
  }

  async findPageCountForCategoryScrape(page: Page, category: Category) : Promise<number> {
    await page.goto(`${this.retailerUrl}/shop/browse/${category.path}`);
    // find pagination_core-pagination-section__E_MA3
    /*
      * possible methods
      * const pages = await page.locator('div:has(a[href*="pageNumber"]) a span').allTextContents();
      * const pagination = page.locator('div').filter({
          has: page.locator('a[href*="pageNumber"]')
        });
      * const pageUrls = await page
        .locator('a[href*="pageNumber"]')
        .evaluateAll(links => links.map(a => (a as HTMLAnchorElement).href));
      */
    const pageNumbers = await page
      .locator(`a[href^="/shop/browse/${category.path}?pageNumber="]`)
      .evaluateAll(links => 
        links
          .map(a => (a as HTMLAnchorElement).href)
          .filter(href => href && /pageNumber=\d+$/.test(href)) 
          .map(href => {
            const match = href!.match(/pageNumber=(\d+)$/);
            return Number(match![1])
          })
      );
    const largestPageNumber = Math.max(...pageNumbers);
    return largestPageNumber;
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
