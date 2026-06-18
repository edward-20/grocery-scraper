import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { WoolworthsScraper } from "../src/scraper/woolworthsScraper.js";
import { readFile } from "fs/promises";

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

  })

  it("parses the categories payload", async () => {
    const mockCategoriesPayload = await readFile('tests/fixtures/woolworths-categories-payload.json', 'utf-8');

    await context.route("https://woolworths.com.au/apis/ui/PiesCategoriesWithSpecials", route => {
      route.fulfill({
        body: mockCategoriesPayload,
        contentType: "application/json",
        status: 200
      })
    })
    const categories = await scraper.discoverCategories(page);
    const expectedUnparsed = await readFile("tests/fixtures/woolworths-parsed-categories.json", "utf-8");
    const expected = await JSON.parse(expectedUnparsed);
    expect(categories).toEqual(expected);

  });

  it.skip("finds the right page count for a category", () => {
    
  });

  it.skip("scrapes the products of a category page", () => {
    /*
    const mockProductPagePayload = await readFile('./fixtures/woolworths-product-page.json', 'utf-8');

    await context.route("https://woolworths.com.au/apis/ui/browse/category", route => {
      route.fulfill({
        body: mockCategoriesPayload,
        contentType: "application/json",
        status: 200
      })
    })
    */
  })

  afterEach(async () => {
    await page.close();
    await context.close();
    await browser.close();
  })

})

