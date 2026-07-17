import { RetailerScraper } from "./retailerScraper.js";
import { Product, Category } from "../db/repository.js";
import * as z from "zod";
import { sleep } from "../utils/time.js";
import { Page } from "playwright";
import { Unit } from "../db/repository.js";

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

type ColesProductUnitNonNullablePricing =
  Omit<z.infer<typeof ColesProductUnit>, "pricing"> & {
    pricing: NonNullable<z.infer<typeof ColesProductUnit>["pricing"]>;
  };

const ColesProductPageUnit = z.discriminatedUnion("_type", [
  ColesProductUnit,
  z.object({
    _type: z.literal("SINGLE_TILE")
  }),
  z.object({
    _type: z.literal("CONTENT_ASSOCIATION")
  })
]);

const ColesProductsPagePayload = z.object({
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

  async discoverCategories(page: Page): Promise<Category[]> {
    this.apiVersion = await this.getAPIVersion(page);
    await sleep(20_000);
    const response = await page.goto(`${this.retailerUrl}/_next/data/${this.apiVersion}/en/browse.json`);

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    return categories;
  }

  private genImagePath(productId: number) {
    const productIdString = productId.toString();
    return `https://shop.coles.com.au/wcsstore/Coles-CAS/images/${productIdString[0]}/${productIdString[1]}/${productIdString[2]}/${productIdString}-zm.jpg`;
  }

  private normaliseUnitOfMeasurement(uom: string): Unit {
    switch (uom) {
      case "ea": return "Each";
      case "g": return "g";
      case "kg": return "Kg";
      case "l": return "L";
      case "L": return "L";
      case "M": return "m";
      case "ml": return "mL";
      case "mL": return "mL";
      case "kgM": return "kgM";
      default: throw new Error(`Couldn't convert to standardised unit of measurement ${uom}`);
    }
  }

  private normaliseColesProductUnitNonNullablePricing(product: ColesProductUnitNonNullablePricing): Product {
    const unitPricing = product.pricing.comparable?.match(/^\$(\d+(?:\.\d+)?)\/\s*(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
    // precondition: if there's no match there's no unit pricing
    return {
      retailerProductId: product.id.toString(),
      currentValue: !unitPricing ? {
        size: product.size,
        price: product.pricing.now
      } : {
        unitPrice: Number(unitPricing[1]),
        unitPriceQuantity: Number(unitPricing[2]),
        unitPriceUnit: this.normaliseUnitOfMeasurement(unitPricing[3]),
        size: product.size,
        price: product.pricing.now,
      },
      name: product.name,
      brand: product.brand,
      path: ``,
      description: product.description,
      image_url: this.genImagePath(product.id),
    }
  }

  private parseProductPageJSON(categoriesJSON: JSON): Product[] {
    const payload = ColesProductsPagePayload.parse(categoriesJSON);
    return payload.pageProps.searchResults.results
      .filter((tile): tile is z.infer<typeof ColesProductUnit> => tile._type !== "SINGLE_TILE" && tile._type !== "CONTENT_ASSOCIATION")
      .filter((productUnit): productUnit is ColesProductUnitNonNullablePricing => {
        return productUnit.pricing !== null
      })
      .map(product => this.normaliseColesProductUnitNonNullablePricing(product));
  }

  private parseCategoriesJSON(categoriesJSON: JSON): Category[] {
    const payload = ColesCategoriesPayload.parse(categoriesJSON);
    return payload.pageProps.allProductCategories.catalogGroupView.map(catalog => ({
      retailerDesignatedCategoryId: catalog.id,
      name: catalog.name,
      path: `/browse/${catalog.seoToken}`
    }));
  }

  private async getProductPageData(page: Page, category: Category, pageNumber?: number): Promise<Product[]> {
    const pageNumberQuery = pageNumber ? `?page=${pageNumber}` : "";
    console.log(`${this.retailerUrl}/_next/data/${this.apiVersion}${category.path}.json${pageNumberQuery}`);
    const productPagePayload = await page.goto(`${this.retailerUrl}/_next/data/${this.apiVersion}${category.path}.json${pageNumberQuery}`);

    const productPageJSON: JSON | null = await productPagePayload?.json();
    if (productPageJSON === null) {
      throw new Error(`Couldn't parse the first page of the Coles category: ${category.name}`);
    }
    return this.parseProductPageJSON(productPageJSON);
  }

  private async getProductPageUrls(page: Page, category: Category, pageNumber?: number): Promise<string[]> {
    const pageNumberQuery = pageNumber ? `?page=${pageNumber}` : "";
    await page.goto(`${this.retailerUrl}${category.path}${pageNumberQuery}`);
    await page.waitForSelector('a.product__link.product__image');
    await sleep(5_000);
    return await page
      .locator('a.product__link.product__image')
      .evaluateAll(elements => 
        elements.map(el => el.getAttribute('href') ?? "")
      )
  }

  private populateProductDataWithProductPaths(products: Product[], productUrls: string[]) {
    products.forEach((product, i) => {
      if (productUrls[i] === null) {
        console.error("Couldn't match the product with its product page url");
      }
      product.path = productUrls[i];
    })
    return products;
  }

  async scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    if (this.apiVersion === "") {
      this.apiVersion = await this.getAPIVersion(page);
    }
    await sleep(5_000);
    // go to the frontend to get the product paths
    const productUrls = await this.getProductPageUrls(page, category);
    await sleep(5_000);
    // go to the api to get product page data for the first page
    const parsedProducts = await this.getProductPageData(page, category);

    // match the results of the frontend to the parsed product data
    this.populateProductDataWithProductPaths(parsedProducts, productUrls);

    let pageNumber = 2;
    while (await page.getByLabel("Go to next page").count() > 0) {
        // do stuff on current page
        await page.getByLabel("Go to next page").click();

        // wait for the next page to load
        await page.waitForLoadState("networkidle");

        // get the frontend product page urls
        const productUrlsOfPage = await this.getProductPageUrls(page, category, pageNumber);
        sleep(5_000);
        // get the api
        const parsedProductsOfPage = await this.getProductPageData(page, category, pageNumber);
        // match them
        this.populateProductDataWithProductPaths(parsedProductsOfPage, productUrlsOfPage);
        
        parsedProducts.push(...parsedProductsOfPage);
        pageNumber++;
    }

    return parsedProducts;
  }

}
