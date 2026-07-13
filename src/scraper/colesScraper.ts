import { RetailerScraper } from "./retailerScraper.js";
import { Product, Category } from "../db/repository.js";
import * as z from "zod";
import { Page } from "playwright";

const ColesCategoriesPayload = z.object({
  pageProps: z.object({
    allProductCategories: z.object({
      catalogGroupView: z.array(z.object({
        id: z.string(),
        name: z.string(),
        seoToken: z.string()
      }))
    })
  })
});

export const ColesProductsPagePayload = z.object({})

export class ColesScraper extends RetailerScraper {
  protected retailerUrl = "https://www.coles.com.au"
  protected apiVersion: string = "";

  // coles works differently? cos it has an API key that needs to be scraped

  private async getAPIVersion(page: Page): Promise<string> {
    await page.goto(this.retailerUrl);
    const script = page.locator("script#__NEXT_DATA__");
    const contents = await script.textContent({ timeout: 60_000});
    // parse the contents and get the API version
    const nextDataPayload = z.object({
      buildId: z.string()
    })
    const contentsJSONParsed = JSON.parse(contents ?? "");
    const parsedContents = nextDataPayload.parse(contentsJSONParsed);
    return parsedContents.buildId;
  }

  private async sleep(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  async discoverCategories(page: Page): Promise<Category[]> {
    this.apiVersion = await this.getAPIVersion(page);
    await this.sleep(20_000);
    const response = await page.goto(`${this.retailerUrl}/_next/data/${this.apiVersion}/en/browse.json`);

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    return categories;
  }

  scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    throw new Error("Not implemented");
  }

  private parseCategoriesJSON(categoriesJSON: JSON): Category[] {
    const payload = ColesCategoriesPayload.parse(categoriesJSON);
    return payload.pageProps.allProductCategories.catalogGroupView.map(catalog => ({
      retailerDesignatedCategoryId: catalog.id,
      name: catalog.name,
      path: `/browse/${catalog.seoToken}`
    }))
  }
}
