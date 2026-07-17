import { Product, Unit } from "../src/db/repository.js";
import { ColesProductsPagePayload, ColesProductUnitNonNullablePricing } from "../src/scraper/colesScraper.js";
import * as z from "zod";
import { readFile, writeFile, readdir } from "fs/promises";
import { warn } from "console";

function changeDescriptionToPath(s : string) {
  return s.toLowerCase().replace(/ /g, "-").replace(/%/g, "percent");
}

function genImagePath(productId: number) {
  const productIdString = productId.toString();
  return `https://shop.coles.com.au/wcsstore/Coles-CAS/images/${productIdString[0]}/${productIdString[1]}/${productIdString[2]}/${productIdString}-zm.jpg`;
}

function normaliseUnitOfMeasurement(uom: string): Unit {
  switch (uom) {
    case "ea": return "Each";
    case "g": return "g";
    case "kg": return "Kg";
    case "l": return "L";
    case "L": return "L";
    case "M": return "m";
    case "ml": return "mL";
    case "mL": return "mL";
    case "kgM": return "kgM";
    default: throw new Error(`Couldn't convert to standardised unit of measurement ${uom}`);
  }
}

// naively parse the product pages
const path = "tests/fixtures/coles/raw";

const files = await readdir(path);

function normaliseColesProductUnitNonNullablePricing(product: ColesProductUnitNonNullablePricing): Product {
  const unitPricing = product.pricing.comparable?.match(/^\$(\d+(?:\.\d+)?)\/\s*(\d+(?:\.\d+)?)([a-zA-Z]+)$/);
   
  // precondition: if there's no match there's no unit pricing
  return {
    retailerProductId: product.id.toString(),
    currentValue: !unitPricing ? {
      size: product.size,
      price: product.pricing.now
    } : {
      unitPrice: Number(unitPricing[1]),
      unitPriceQuantity: Number(unitPricing[2]),
      unitPriceUnit: normaliseUnitOfMeasurement(unitPricing[3]),
      size: product.size,
      price: product.pricing.now,
    },
    name: product.name,
    brand: product.brand,
    path: `/product/${changeDescriptionToPath(product.description)}-${product.id}`, // this is unknown how to generate the hyphenated name
    description: product.description,
    image_url: genImagePath(product.id),
    // https://shop.coles.com.au/wcsstore/Coles-CAS/images/5/0/9/5096335-zm.jpg
    // https://shop.coles.com.au/wcsstore/Coles-CAS/images/6/1/2/6121937-zm.jpg
  }
}

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

