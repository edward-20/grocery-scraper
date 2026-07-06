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
        Barcode: z.string(),
        GtinFormat: z.union([z.literal(8), z.literal(12), z.literal(13), z.literal(14)]),
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
        Barcode: z.string(),
        GtinFormat: z.union([z.literal(8), z.literal(12), z.literal(13), z.literal(14)]),
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

  async scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    const responsePromise = page.waitForResponse(`${this.retailerUrl}/apis/ui/browse/category`);
    await page.goto(`${this.retailerUrl}${category.path}`);

    // scrape and then go to the next page

    const response = await responsePromise;
    const data = await response?.json()
    const products = this.parseProductsPageJSON(data);
    return products;
  }

  private parseCategoriesJSON(json: JSON) : Category[] {
    const payload = WoolworthsCategoriesPayload.parse(json);

    return payload.Categories.map((category) => ({
      retailerDesignatedCategoryId: category.NodeId,
      name: category.Description,
      path: `/shop/browse/${category.UrlFriendlyName}`,
      pages: 0,
      retailerDesignatedProductCount: 0
    }))
  }

  private parseProductsPageJSON(json: JSON) : Product[] {
    const productsPayload = WoolworthsProductsPagePayload.parse(json);
    const bundles = productsPayload.Bundles;


    return bundles
      .map(bundle => bundle.Products[0])
      .filter(product => product.Price !== null)
      .map(product => {
        let result: Product;
        if (product.HasCupPrice) {
          result = {
            retailerProductId: product.Stockcode.toString(),
            crossRetailerId: product.Barcode,
            gtinFormat: product.GtinFormat,
            currentValue: {
              unitPrice: product.CupPrice,
              unitPriceQuantity: 1, // this is incorrect and needs to be parsed from the product.CupMeasure
              unitPriceUnit: product.CupMeasure as Unit, // this is a kludge and we'll try to see where it fails in the tests

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
            crossRetailerId: product.Barcode,
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

