import { ColesProductsPagePayload } from "../src/scraper/colesScraper.js";
import { readFile, writeFile, readdir } from "fs/promises";

// naively parse the product pages
const path = "tests/fixtures/coles/raw";

const files = await readdir(path);

for (const file of files.filter(filename => filename.endsWith(".json")).filter(filename => filename !== "woolworths-categories-payload.json")) {
  console.log(file);
  const productPagePayload = await readFile(`tests/fixtures/coles/raw/${file}`, "utf-8");

  try {
    const json = JSON.parse(productPagePayload);
    const naiveProducts = ColesProductsPagePayload.parse(json);

    const semiParsedResult = naiveProducts.Bundles
      .map(bundle => bundle.Products[0])
      .filter(product => product.Price !== undefined && product.Price !== null)
      .map(product => ({
        retailerProductId: product.Stockcode.toString(),
        crossRetailerId: product.Barcode ?? undefined,
        gtinFormat: product.GtinFormat,
        currentValue: product.HasCupPrice ? {
          unitPrice: product.CupPrice,
          unitPriceQuantity: product.CupMeasure, // manual editing
          unitPriceUnit: product.CupMeasure,
          size: product.PackageSize,
          price: product.Price as number,
        } : {
          size: product.PackageSize,
          price: product.Price as number,
        },
        name: product.DisplayName,
        brand: product.Brand ?? undefined,
        path: `/shop/productdetails/${product.Stockcode}/${product.UrlFriendlyName}`,
        description: product.Description,
        image_url: product.MediumImageFile,
      }));

    const result = JSON.stringify(semiParsedResult, null, 2);

    await writeFile(`tests/fixtures/woolworths/parsed/woolworths-semi-parsed-product-page-${file}`, result);
  } catch (error) {
    console.error(error);
    process.exit();
  }

}

