import { RetailerScraper, Category, Unit } from "./retailerScraper.js";
import { Product } from "./retailerScraper.js";
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
    Products: z.array(z.object({ // weird because its an array with only one object
      Stockcode: z.number(),         // retailer_product_id
      Barcode: z.string(),           // cross_retailer_id
      GtinFormat: z.string(),        // gtin_format
      CupPrice: z.number(),          // value_at_time: unitPrice
      CupMeasure: z.string(),        // "10g" value_at_time: unitPriceQuantity + unitPriceMeasureQuantity
      Price: z.number(),             // value_at_time: price
      Unit: z.string(),              // "Each" value_at_time: sizeUnit
      PackageSize: z.string(),       // "80g" value_at_time: sizeQuantity
      MinimumQuantity: z.number(),    // 1 value_at_time: size_quantity_min
      Name: z.string(),              // name
      DisplayName: z.string(),       // name
      Brand: z.string(),             // brand
      UrlFriendlyName: z.string(),   // path
      Description: z.string(),       // description
      SmallImageFile: z.string(),    // image_url
      MediumImageFile: z.string(),   // image_url
      LargeImageFile: z.string(),    // image_url
    })),
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

  async findPageCountForCategoryScrape(page: Page, category: Category) : Promise<number> {
    await page.goto(`${this.retailerUrl}/shop/browse/${category.path}`, { waitUntil: 'domcontentloaded' });
    const paginationLinks = page.locator(`a[href^="/shop/browse/${category.path}?pageNumber="]`)
    await paginationLinks.first().waitFor({
      state: "attached",
      timeout: 100_000
    })

    const count = await paginationLinks.count();

    let maxPage = 1;

    for (let i = 0; i < count; i++) {
      const href = await paginationLinks.nth(i).getAttribute('href');

      if (!href) continue;

      const match = href.match(/pageNumber=(\d+)$/);
      if (!match) continue;

      const pageNum = Number(match[1]);
      if (pageNum > maxPage) maxPage = pageNum;
    }

    return maxPage;

    // const pageNumbers = await locator.
    //   .evaluateAll(links => 
    //     links
    //       .map(a => (a as HTMLAnchorElement).href)
    //       .filter(href => href && /pageNumber=\d+$/.test(href)) 
    //       .map(href => {
    //         const match = href!.match(/pageNumber=(\d+)$/);
    //         return Number(match![1])
    //       })
    //   );
    // const largestPageNumber = Math.max(...pageNumbers);
    // return largestPageNumber;
    // const hrefs = await locator.all();
    // const pageNumbers = await page
    //   .locator(`a[href^="/shop/browse/${category.path}?pageNumber="]`)
    //   .evaluateAll(links => 
    //     links
    //       .map(a => (a as HTMLAnchorElement).href)
    //       .filter(href => href && /pageNumber=\d+$/.test(href)) 
    //       .map(href => {
    //         const match = href!.match(/pageNumber=(\d+)$/);
    //         return Number(match![1])
    //       })
    //   );
    // const largestPageNumber = Math.max(...pageNumbers);
    // return largestPageNumber;
  }

  async scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]> {
    const responsePromise = page.waitForResponse(`${this.retailerUrl}/apis/ui/browse/category`);
    await page.goto(`${this.retailerUrl}/shop/browse/${category.path}?pageNumber=${pageNumber}`);

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
      .map(product => ({
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
      }))
  }

}

