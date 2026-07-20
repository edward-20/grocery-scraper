import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Browser, Page, BrowserContext } from "playwright";
import { chromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth"
import { ColesScraper } from "../src/scraper/colesScraper.js";
import { readFile } from "fs/promises";
import { Category } from "../src/db/repository.js";
import { sleep } from "../src/utils/time.js";

const expectedCategoriesUnparsed = await readFile("tests/fixtures/coles/parsed/coles-parsed-categories.json", "utf-8");
const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
describe("ColesScraper", () => {
  let scraper: ColesScraper;
  let browser: Browser;
  let context: BrowserContext
  let testPage: Page;
  let scraperPage: Page;


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
    testPage = await context.newPage();
    scraperPage = await context.newPage();

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
    const receivedCategories: Category[] = await scraper.discoverCategories(scraperPage);
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/coles/parsed/coles-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it.skip("discovers the categories correctly on 13/07/2026", async () => {
    const receivedCategories: Category[] = await scraper.discoverCategories(scraperPage);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  it.each(expectedCategories)(`scrape products of category: $name with a valid image url`, async (category: Category) => {
    const receivedProducts = await scraper.scrapeProductsOfCategory(scraperPage, category);
    for (const product of receivedProducts) {
      // check that the product image url leads to a real image url
      if (!product.image_url) {
        continue;
      }
      const response = await testPage.goto(product.image_url);
      expect(response?.status()).toEqual(200);
      // have to check we didn't get scrape checked
      await sleep(7_500);
    }
  })

  afterEach(async () => {
    await scraperPage.close();
    await testPage.close();
    await context.close();
    await browser.close();
  }, 0)

}, 0);
