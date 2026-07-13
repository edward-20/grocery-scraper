import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { chromium, Browser, Page, BrowserContext } from "playwright";
import { ColesScraper } from "../src/scraper/colesScraper.js";
import { readFile, readdir } from "fs/promises";
import { Category, Product } from "../src/db/repository.js";

const rawFixturePath = "tests/fixtures/coles/raw";
const parsedFixturePath = "tests/fixtures/coles/parsed";
const rawFixtureFiles = await readdir(rawFixturePath);
const parsedFixtureFiles = await readdir(parsedFixturePath);

// categories: find all unique category names from the fixtures directory
const categories = [
  ...new Set(
    rawFixtureFiles.map(file =>
      file.replace(/(?:-\d+)?\.json$/, "")
    )
  )
].filter(category => category !== "woolworths-categories-payload");


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

    browser = await chromium.launch({ headless: false });
    context = await browser.newContext({
      locale: "en-AU",
      timezoneId: "Australia/Sydney",
      userAgent:
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    })
    page = await context.newPage();

  }, 0)

  it("parses the categories payload", async () => {
    // coles categories aren't extracted from a network request but instead is
    // embedded in the home page, so we have to mock the home page 
    const mockCategoriesPayload = await readFile('tests/fixtures/coles/raw/coles-categories-payload.txt', 'utf-8');

    await context.route("https://www.coles.com.au", route => {
      route.fulfill({
        body: `
          <html lang="en">
            <head>
            </head>
            <body>
              <script id="__NEXT_DATA__" type="application/json">${mockCategoriesPayload}</script>
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

  it("discovers the categories correctly on 13/07/2026", async () => {
    const receivedCategories: Category[] = await scraper.discoverCategories(page);
    const expectedCategoriesUnparsed = await readFile("tests/fixtures/woolworths-parsed-categories.json", "utf-8");
    const expectedCategories: Category[] = await JSON.parse(expectedCategoriesUnparsed);
    // order doesn't matter in the array (order it by something)
    receivedCategories.sort((a, b) => a.name.localeCompare(b.name));
    expectedCategories.sort((a, b) => a.name.localeCompare(b.name));

    expect(receivedCategories).toEqual(expectedCategories);
  });

  // for each category
  it.skip.each(categories)("testing scrapeProductsOfCategory: %s", async (categoryName) => {
    throw new Error("Not implemented");
    // derive the raw and parsed fixture name from categoryName
    const categoryRawFixtureFiles = rawFixtureFiles.filter(rawFixtureFile => rawFixtureFile.includes(categoryName));
    const categoryParsedFixtureFiles = parsedFixtureFiles.filter(parsedFixtureFile => parsedFixtureFile.includes(categoryName));

    let rawPayloads: string[] = [];
    for (const categoryRawFixtureFile of categoryRawFixtureFiles) {
      rawPayloads.push(await readFile(`${rawFixturePath}/${categoryRawFixtureFile}`, "utf-8"));
    }

    let parsedPayloads: string[] = [];
    for (const categoryParsedFixtureFile of categoryParsedFixtureFiles) {
      parsedPayloads.push(await readFile(`${parsedFixturePath}/${categoryParsedFixtureFile}`, "utf-8"));
    }

    await context.route("https://www.woolworths.com.au/apis/ui/browse/category", async route => {
      await route.fulfill({
        body: rawPayloads.length > 0 ? rawPayloads.shift() : `{
          "Bundles": []
        }`,
        contentType: "application/json",
        status: 200
      })
    });
    
    const category: Category = {
      retailerDesignatedCategoryId: categoryName, // not correct, but for the purpose of testing will be fine
      name: categoryName,
      path: `/shop/browse/${categoryName}`,
    };

    const receivedProducts = await scraper.scrapeProductsOfCategory(page, category);
    const expectedProducts: Product[] = parsedPayloads.map(parsedPayload => JSON.parse(parsedPayload)).flat();

    expectedProducts.sort((a, b) => a.retailerProductId.localeCompare(b.name));
    receivedProducts.sort((a, b) => a.retailerProductId.localeCompare(b.name));

    expect(receivedProducts, `scrape of ${categoryName} to match its corresponding fixture files`).toEqual(expectedProducts);
  })

  afterEach(async () => {
    await page.close();
    await context.close();
    await browser.close();
  }, 0)

}, 0);
