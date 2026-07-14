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

const ColesProductUnit = z.object({
  _type: z.union([z.literal("PRODUCT"), z.literal("PRODUCT_ASSOCIATION")]),
  id: z.number(),
  name: z.string(),
  brand: z.string(),
  description: z.string(),
  size: z.string(),
  imageUris: z.array(z.object({
    uri: z.string(),
  })),
  pricing: z.object({
    now: z.number(),
    unit: z.union([
      z.object({
        quantity: z.number(),
        ofMeasureQuantity: z.number(),
        ofMeasureUnits: z.string(),
        price: z.number(),
        ofMeasureType: z.string(),
      }),
      z.object({
      })
    ]),
    comparable: z.string().optional()
  }).nullable(),
});

type ColesProductUnitType = z.infer<typeof ColesProductUnit>;

export type ColesProductUnitNonNullablePricing =
  Omit<z.infer<typeof ColesProductUnit>, "pricing"> & {
    pricing: NonNullable<z.infer<typeof ColesProductUnit>["pricing"]>;
  };

const ColesProductPageUnit = z.discriminatedUnion("_type", [
  ColesProductUnit,
  z.object({
    _type: z.literal("SHOPPABLE_BANNER"),
    shoppableProducts: z.array(ColesProductUnit)
  }),
  z.object({
    _type: z.literal("SINGLE_TILE")
  }),
  z.object({
    _type: z.literal("CONTENT_ASSOCIATION")
  })
]);

export const ColesProductsPagePayload = z.object({
  pageProps: z.object({
    searchResults: z.object({
      results: z.array(ColesProductPageUnit)
    })
  })
})

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
