import type { Page } from "playwright";

export abstract class RetailerScraper {
  constructor(retailerConfig: RetailerScrapeConfig, runId: number) {}
  discoverCategories(page: Page): Promise<Category[]> { return Promise.resolve([{name:"", url:"", pages: 1}])}; // should supply information to be able to fulfill a row of Categories and categoryScrape
  findPageCountPerCategory(page: Page, category: Category) : number { return 1 };
  scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]> {
    return Promise.resolve([]);
  };
  // this is really only applicable to the coles website because I can't extract
  // the variants unless we used the url of a single product page, maybe there
  // can be a RetailerScrapeConfig flag asking for detailed or non-detailed 
  scrapeSingleProduct(page: Page, category: Category, product: SingleProduct) : Promise<Product> {
    return Promise.resolve({
      name: "",
    } as Product)
  };
}
