import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { WoolworthsScraper } from "../src/scraper/woolworthsScraper.js";
import { readFile } from "fs/promises";
import { Category, Product } from "../src/db/repository.js";
import { readdir } from "fs/promises";

describe("WoolworthsScraper", () => {
  let scraper: WoolworthsScraper;
  let browser: Browser;
  let context: BrowserContext
  let page: Page;


  beforeEach(async () => {
    scraper = new WoolworthsScraper({
      name: "Woolworths",
      enabled: true,
      productByProduct: false
    });

    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({
      locale: "en-AU",
      timezoneId: "Australia/Sydney",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    })
    page = await context.newPage();

  }, 0)

  it.skip("parses the categories payload", async () => {
    const mockCategoriesPayload = await readFile('tests/fixtures/woolworths-categories-payload.json', 'utf-8');

    await context.route("https://www.woolworths.com.au/apis/ui/PiesCategoriesWithSpecials", route => {
      route.fulfill({
        body: mockCategoriesPayload,
        contentType: "application/json",
        status: 200
      })
    })
    const receivedCategories: Category[] = await scraper.discoverCategories(page);
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/woolworths-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it.skip("discovers the categories correctly on 18/06/2026", async () => {
    const receivedCategories: Category[] = await scraper.discoverCategories(page);
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/woolworths-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it("parses the products of a product page payload", async () => {
    const path = "tests/fixtures/woolworths/parsed";
    const files = await readdir("tests/fixtures/woolworths/parsed", "utf-8");

    for (const file of files.filter(filename => filename.endsWith(".json"))) {
    const mockProductPagePayload = await readFile('tests/fixtures/woolworths-product-page-payload.json', 'utf-8');

    await context.route("https://www.woolworths.com.au/apis/ui/browse/category", route => {
      route.fulfill({
        body: mockProductPagePayload,
        contentType: "application/json",
        status: 200
      })
    })

    const category = {
      "retailerDesignatedCategoryId": "1_DEB537E",
      "name": "Bakery",
      "path": "/shop/browse/bakery",
      "retailerDesignatedProductCount": 0
    };

    const receivedProducts: Product[] = await scraper.scrapeProductsOfCategory(page, category);
    const expectedProductsPayload = await readFile("tests/fixtures/woolworths-parsed-product-page.json", "utf-8");
    const expectedProducts: Product[] = await JSON.parse(expectedProductsPayload);
    // order doesn't matter in the array (order it by something)
    expectedProducts.sort((a, b) => a.name.localeCompare(b.name));
    receivedProducts.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedProducts).toEqual(expectedProducts);
  })

  afterEach(async () => {
    await page.close();
    await context.close();
    await browser.close();
  }, 0)

}, 200_000);
