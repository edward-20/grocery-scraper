import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Browser, Page, BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { ColesScraper } from "../src/scraper/colesScraper.js";
import { readFile, readdir } from "fs/promises";
import { Category, Product } from "../src/db/repository.js";
import { sleep } from "../src/utils/time.js";

const expectedCategoriesUnparsed = await readFile("tests/fixtures/coles/parsed/coles-parsed-categories.json", "utf-8");
const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
describe("ColesScraper", () => {
  let scraper: ColesScraper;
  let browser: Browser;
  let context: BrowserContext
  let page: Page;


  beforeEach(async () => {
    scraper = new ColesScraper({
      name: "Coles",
      enabled: true,
      productByProduct: false
    });

    chromium.use(StealthPlugin());
    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({
      locale: "en-AU",
      timezoneId: "Australia/Sydney",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 720 }
    })
    page = await context.newPage();

  }, 0)

  it.skip("parses the categories payload", async () => {
    const mockCategoriesPayload = await readFile('tests/fixtures/coles/raw/coles-categories-payload.txt', 'utf-8');

    await context.route("https://www.coles.com.au/_next/data/20260702.2-cdcde970c50768337017410cc7320816bc2580c8/en/browse.json", route => {
      route.fulfill({
        body: mockCategoriesPayload,
        contentType: "application/json",
        status: 200
      })
    })

    // also need to mock the API version
    const mockNextData = await readFile('tests/fixtures/coles/raw/next-data.html');
    await context.route("https://www.coles.com.au", route => {
      route.fulfill({
        body: `
<html>
  <head></head>
  <body>
    ${mockNextData}
  </body>
</html>
`,
        contentType: "text/html",
        status: 200
      })
    })
    const receivedCategories: Category[] = await scraper.discoverCategories(page);
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/coles/parsed/coles-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it.skip("discovers the categories correctly on 13/07/2026", async () => {
    const receivedCategories: Category[] = await scraper.discoverCategories(page);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  // have a test here to check that the product paths generated from
  // scrapeProductsOfCategory are legit
  it.each(expectedCategories)(`scrapes products of category: $name with a valid product path`, async (category: Category) => {
    const receivedProducts = await scraper.scrapeProductsOfCategory(page, category);
    for (const product of receivedProducts) {
      // check that the product path leads to a real page
      const response = await page.goto(`https://www.coles.com.au${product.path}`);
      expect(response?.status()).toEqual(200);
      await sleep(7_500);
      // have to check we didn't get scrape checked
    }
  })

  it.skip.each(expectedCategories)(`scrape products of category: $name with a valid image url`, async (category: Category) => {
    const receivedProducts = await scraper.scrapeProductsOfCategory(page, category);
    for (const product of receivedProducts) {
      // check that the product image url leads to a real image url
      if (!product.image_url) {
        continue;
      }
      const response = await page.goto(product.image_url);
      expect(response?.status()).toEqual(200);
      // have to check we didn't get scrape checked
      await sleep(7_500);
    }
  })

  afterEach(async () => {
    await page.close();
    await context.close();
    await browser.close();
  }, 0)

}, 0);
