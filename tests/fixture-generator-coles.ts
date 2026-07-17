import { Product, Unit } from "../src/db/repository.js";
import { ColesProductsPagePayload, ColesProductUnitNonNullablePricing } from "../src/scraper/colesScraper.js";
import { readFile, writeFile, readdir } from "fs/promises";


// naively parse the product pages
const path = "tests/fixtures/coles/raw";

const files = await readdir(path);

for (const file of files.filter(filename => filename.endsWith(".json"))) {
  console.log(file);
  const productPagePayload = await readFile(`tests/fixtures/coles/raw/${file}`, "utf-8");

  try {
    const json = JSON.parse(productPagePayload);
    const naiveProducts = ColesProductsPagePayload.parse(json);

    let semiParsedResult: Product[];
    let productsOfPayload: Product[] = naiveProducts.pageProps.searchResults.results
      .filter(product => product._type !== "SINGLE_TILE" && product._type !== "SHOPPABLE_BANNER" && product._type !== "CONTENT_ASSOCIATION")
      .filter((product): product is ColesProductUnitNonNullablePricing => product.pricing !== null)
      .map(normaliseColesProductUnitNonNullablePricing);
    let shoppableBannersOfPayload: Product[] = naiveProducts.pageProps.searchResults.results
      .filter(product => product._type === "SHOPPABLE_BANNER")
      .flatMap(banner => banner.shoppableProducts)
      .filter((product): product is ColesProductUnitNonNullablePricing => product.pricing !== null)
      .map(normaliseColesProductUnitNonNullablePricing)

    semiParsedResult = productsOfPayload.concat(shoppableBannersOfPayload);
    const result = JSON.stringify(semiParsedResult, null, 2);

    await writeFile(`tests/fixtures/coles/parsed/coles-semi-parsed-product-page-${file}`, result);
  } catch (error) {
    console.error(error);
    process.exit();
  }
}
