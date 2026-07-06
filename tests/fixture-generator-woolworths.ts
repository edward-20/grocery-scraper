import { WoolworthsProductsPagePayload } from "../src/scraper/woolworthsScraper.js";
import { readFile, writeFile } from "fs/promises";


// naively parse the product page
const productPagePayload = await readFile('tests/fixtures/woolworths/raw/woolworths-product-page-payload.json', 'utf-8');

try {
  const json = JSON.parse(productPagePayload);
  const naiveProducts = WoolworthsProductsPagePayload.parse(json);

  const semiParsedResult = naiveProducts.Bundles.map(bundle => bundle.Products[0]);

  const result = JSON.stringify(semiParsedResult, null, 2);

  await writeFile("tests/fixtures/woolworths/parsed/woolworths-semi-parsed-product-page.json", result);
} catch (error) {
  console.error(error);
}
