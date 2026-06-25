import { RetailerScraper, Category, Unit } from "./retailerScraper.js";
import { Page } from "playwright";
import * as z from "zod";

const WoolworthsCategoriesPayload = z.object({
  Categories: z.array(z.object({
    NodeId: z.string(), // maps to retailerDesignatedCategoryId
    Description: z.string(),  // maps to name
    UrlFriendlyName: z.string(),
  }))
})

const WoolworthsProductsPagePayload = z.object({
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

        HasCupPrice: z.literal(false),
        Price: z.number().nullable(),             // WHY????
        PackageSize: z.string(),       // "80g" value_at_time: sizeQuantity
      }),
    ])),
    Name: z.string(),
    DisplayName: z.string()
  }))
})

export class WoolworthsScraper extends RetailerScraper {
  protected retailerUrl = "https://woolworths.com.au"
  async discoverCategories(page: Page): Promise<Category[]> {
    const response = await page.goto(`${this.retailerUrl}/apis/ui/PiesCategoriesWithSpecials`);

    const json = await response?.json();
    const categories = this.parseCategoriesJSON(json);

    return categories.filter(category => category.retailerDesignatedCategoryId !== "specialsgroup"); 
  }

  async scrapeProductsOfCategory(page: Page, category: Category) : Promise<Product[]> {
    const responsePromise = page.waitForResponse(`${this.retailerUrl}/apis/ui/browse/category`);
    await page.goto(`${this.retailerUrl}/shop/browse/${category.path}`);

    // scrape and then go to the next page

    const response = await responsePromise;
    const data = await response?.json()
    const products = this.parseProductsPageJSON(data, category.retailerDesignatedCategoryId);
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

  private parseProductsPageJSON(json: JSON, categoryId: string) : Product[] {
    const productsPayload = WoolworthsProductsPagePayload.parse(json);
    const bundles = productsPayload.Bundles;


    return bundles
      .map(bundle => bundle.Products[0])
      .map(product => {
        if (product.HasCupPrice) {
          return {
            categoryId: categoryId,
            retailerProductId: product.Stockcode.toString(),
            crossRetailerId: product.Barcode,
            gtinFormat: parseInt(product.GtinFormat),
            currentValue: {
              unitPrice: product.CupPrice,
              unitPriceQuantity: 1,
              unitPriceMeasureQuantity: parseFloat(product.CupMeasure), // but it needs to be regexed
              unitPriceUnit: product.CupMeasure as Unit, // but it needs to be regexed

              sizeUnit: product.Unit as Unit, // but it needs to conform to the union type
              sizeQuantity: parseFloat(product.PackageSize), //
              sizeQuantityMin: product.MinimumQuantity,
              price: product.Price,
            }, 
            name: product.Name,
            brand: product.Brand,
            path: product.UrlFriendlyName, // needs adjustment
            description: product.Description,
            image_url: product.MediumImageFile 
          }
        } else {
          return 1;
        }
      })
  }

}

