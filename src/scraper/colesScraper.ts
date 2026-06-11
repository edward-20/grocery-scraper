import { RetailerScraper, Category, SingleProduct } from "./retailerScraper.js";
import { Product } from "../types.js";
import { Page } from "playwright";

// stubbed
export class ColesScraper extends RetailerScraper {
  discoverCategories(page: Page): Promise<Category[]> {
    return Promise.resolve([{name: "", url: "", pages: 0}]);
  }
  findPageCountPerCategory(page: Page, category: Category) : number {
    return 0;
  }
  scrapeProductsOfCategoryPage(page: Page, category: Category, pageNumber: number) : Promise<Product[]> {
    return Promise.resolve(
      [{
      name: "",
      url: ""
      } as Product])
  }
  scrapeSingleProduct(page: Page, category: Category, product: SingleProduct) : Promise<Product> {
    return Promise.resolve({
      name: "",
    } as Product)
  }
}
