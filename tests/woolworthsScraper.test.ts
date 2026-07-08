import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { WoolworthsScraper } from "../src/scraper/woolworthsScraper.js";
import { readFile, readdir } from "fs/promises";
import { Category, Product } from "../src/db/repository.js";

const rawFixturePath = "tests/fixtures/woolworths/raw";
const parsedFixturePath = "tests/fixtures/woolworths/parsed";
const rawFixtureFiles = await readdir(rawFixturePath);
const productPageFixtureCases = rawFixtureFiles
  .filter(filename => filename !== "woolworths-categories-payload.json")
  .sort()
  .map(rawFixtureFile => {
    const fixtureName = rawFixtureFile.replace(/\.[^.]+$/, "");
    const parsedFixtureFile = `woolworths-parsed-product-page-${fixtureName}.json`;

    return {
      fixtureName,
      rawFixtureFile,
      parsedFixtureFile,
    };
  });

// categories: find all unique category names from the fixtures directory
const categories = [
  ...new Set(
    rawFixtureFiles.map(file =>
      file.replace(/(?:-\d+)?\.json$/, "")
    )
  )
].filter(category => category !== "woolworths-categories-payload");


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

  it.skip.each(productPageFixtureCases)(
    "parses products from $rawFixtureFile against $parsedFixtureFile",
    async ({ fixtureName, rawFixtureFile, parsedFixtureFile }) => {
      const rawPayload = await readFile(`${rawFixturePath}/${rawFixtureFile}`, "utf-8");
      const parsedPayload = await readFile(
        `${parsedFixturePath}/${parsedFixtureFile}`,
        "utf-8"
      );

      await context.route("https://www.woolworths.com.au/apis/ui/browse/category", route => {
        route.fulfill({
          body: rawPayload,
          contentType: "application/json",
          status: 200
        })
      }, { times: 1 });

      await context.route("https://www.woolworths.com.au/shop/browse/**", route => {
        route.fulfill({
          body: `
            <!doctype html>
            <html>
              <body>
                <script>
                  fetch("/apis/ui/browse/category");
                </script>
              </body>
            </html>
          `,
          contentType: "text/html",
          status: 200
        })
      }, { times: 1 });

      const category: Category = {
        retailerDesignatedCategoryId: fixtureName,
        name: fixtureName,
        path: `/shop/browse/${fixtureName.replace(/-\d+$/, "")}`,
      };

      const receivedProducts = await scraper.scrapeProductsOfCategory(page, category);
      const expectedProducts: Product[] = JSON.parse(parsedPayload);

      expectedProducts.sort((a, b) => a.name.localeCompare(b.name));
      receivedProducts.sort((a, b) => a.name.localeCompare(b.name));

      expect(receivedProducts, `${rawFixtureFile} -> ${parsedFixtureFile}`).toEqual(expectedProducts);
    }
  )

  // for each category
  it.each(categories)("testing scrapeProductsOfCategory: %s", (category) => {
    console.log(category);
  })

  afterEach(async () => {
    await page.close();
    await context.close();
    await browser.close();
  }, 0)

}, 200_000);
