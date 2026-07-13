import { RetailerScraper } from "./retailerScraper.js";
import { Page } from "playwright";
import * as z from "zod";
import { Category, Product } from "../db/repository.js";
import { Unit } from "../db/repository.js";

const WoolworthsCategoriesPayload = z.object({
  Categories: z.array(z.object({
    NodeId: z.string(), // maps to retailerDesignatedCategoryId
    Description: z.string(),  // maps to name
    UrlFriendlyName: z.string(),
  }))
})

export const WoolworthsProductsPagePayload = z.object({
  Bundles: z.array(z.object({
    Products: z.array(z.discriminatedUnion("HasCupPrice", [
      z.object({
        // product specific
        // retailerProductId, crossRetailerId, gtinFormat, currentValueId, name,
        // brand, path, description, image_url
        Stockcode: z.number(),
        Barcode: z.string().nullable(),
        GtinFormat: z.union([z.literal(0), z.literal(8), z.literal(12), z.literal(13), z.literal(14)]),
        DisplayName: z.string(),              // name
        Brand: z.string().nullable(),             // brand
        Description: z.string(),       // description
        UrlFriendlyName: z.string(),
        MediumImageFile: z.string(),

        // value_at_time specific
        // unit_price, unit_price_quantity, 
        // unit_price_unit_of_measurement, size, price
        HasCupPrice: z.literal(true),
        CupPrice: z.number(),          // value_at_time: unitPrice
        CupMeasure: z.string(),        // "10g" value_at_time: unitPriceQuantity + unitPriceMeasureQuantity
        CupString: z.string(),
        PackageSize: z.string(),       // "80g" value_at_time: sizeQuantity
        Price: z.number().nullable(),  // When its null it means the product can't be bought, skip scrape
      }),
      z.object({
        Stockcode: z.number(),
        Barcode: z.string().nullable(),
        GtinFormat: z.union([z.literal(0), z.literal(8), z.literal(12), z.literal(13), z.literal(14)]),
        DisplayName: z.string(),              // name
        Brand: z.string().nullable(),             // brand
        Description: z.string(),       // description
        UrlFriendlyName: z.string(),
        MediumImageFile: z.string(),

        HasCupPrice: z.literal(false),
        Price: z.number().nullable(),             // WHY????
        PackageSize: z.string(),       // "80g" value_at_time: sizeQuantity
      }),
    ])),
  }))
})

export class WoolworthsScraper extends RetailerScraper {
  protected retailerUrl = "https://www.woolworths.com.au"
  async discoverCategories(page: Page): Promise<Category[]> {
    const response = await page.goto(`${this.retailerUrl}/apis/ui/PiesCategoriesWithSpecials`);

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    return categories.filter(category => category.retailerDesignatedCategoryId !== "specialsgroup"); 
  }

  private async sleep(time: number) {
    return new Promise((resolve) => setTimeout(resolve, time));
  }

  getFulfilledResponse(page: Page) {
    return page.waitForResponse(`${this.retailerUrl}/apis/ui/browse/category`);
  }

  async scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    let productPageResponse = this.getFulfilledResponse(page);

    await page.goto(`${this.retailerUrl}${category.path}`);

    let response = await productPageResponse;
    let rawData = await response?.json();
    let products: Product[] = this.parseProductsPageJSON(rawData);

    while (true) {
      const nextLink = page.locator('a[rel="next"]');
      await this.sleep(10000);

      // Stop if no next button or disabled
      if (!(await nextLink.isVisible()) || await nextLink.isDisabled()) {
        break;
      }
      await nextLink.scrollIntoViewIfNeeded();

      // Start waiting BEFORE clicking
      let productPageResponse = this.getFulfilledResponse(page);

      await this.sleep(3000);
      await nextLink.click();
      await this.sleep(5000);

      // This resolves when the click triggers the API request
      response = await productPageResponse;
      rawData = await response?.json();

      products = [...products, ...this.parseProductsPageJSON(rawData)];
    }
    return products;
  }

  private parseCategoriesJSON(json: JSON) : Category[] {
    const payload = WoolworthsCategoriesPayload.parse(json);

    return payload.Categories.map((category) => ({
      retailerDesignatedCategoryId: category.NodeId,
      name: category.Description,
      path: `/shop/browse/${category.UrlFriendlyName}`,
    }))
  }

  private parseRawUnit(rawUnit: string) : Unit {
    switch(rawUnit) {
      case "EA":
        return "Each";
      case "KG":
        return "Kg";
      case "G":
        return "g";
      case "ML":
        return "mL";
      case "L":
        return "L";
      case "sheets":
        return "sheets";
      case "M":
        return "m";
      default: 
        throw Error(`Couldn't parse the raw unit string: ${rawUnit}`);
    }
  }
  private parseProductsPageJSON(json: JSON) : Product[] {
    const productsPayload = WoolworthsProductsPagePayload.parse(json);
    const bundles = productsPayload.Bundles;


    return bundles
      .map(bundle => bundle.Products[0])
      .filter(product => product.Price !== null && product.Price !== undefined)
      .map(product => {
        let result: Product;
        if (product.HasCupPrice) {
          let unitPriceQuantityMatch = product.CupMeasure.match(/^[0-9]+/);
          let unitPriceUnitMatch = product.CupMeasure.match(/^([0-9]+)([\s]*)([A-Za-z]+)/);

          let unitPriceQuantity = unitPriceQuantityMatch === null ? 0 : Number(unitPriceQuantityMatch[0]);
          let unitPriceUnit: Unit = this.parseRawUnit(unitPriceUnitMatch === null ? "" : unitPriceUnitMatch[3]) ;


          result = {
            retailerProductId: product.Stockcode.toString(),
            crossRetailerId: product.Barcode ?? undefined,
            gtinFormat: product.GtinFormat,
            currentValue: {
              unitPrice: product.CupPrice,
              unitPriceQuantity,
              unitPriceUnit,
              size: product.PackageSize,
              price: product.Price as number,
            }, 
            name: product.DisplayName,
            brand: product.Brand ?? undefined,
            path: `/shop/productdetails/${product.Stockcode}/${product.UrlFriendlyName}`, // needs adjustment
            description: product.Description,
            image_url: product.MediumImageFile 
          }
        } else {
          result ={
            retailerProductId: product.Stockcode.toString(),
            crossRetailerId: product.Barcode ?? undefined,
            gtinFormat: product.GtinFormat,
            currentValue: {
              size: product.PackageSize,
              price: product.Price as number,
            }, 
            name: product.DisplayName,
            brand: product.Brand ?? undefined,
            path: `/shop/productdetails/${product.Stockcode}/${product.UrlFriendlyName}`,
            description: product.Description,
            image_url: product.MediumImageFile 
          };
        }
        return result;
      })
  }

}

