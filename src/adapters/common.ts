import type { Page } from "playwright";
import type { ProductCore, ProductSnapshot, RetailerName } from "../types.js";
import { normalizeUrl, uniqueUrls } from "../utils/url.js";
import {
  capturePageSnapshot,
  extractImage,
  findObjects,
  firstNumber,
  firstString,
  getPath,
  type PageSnapshot,
} from "./extraction.js";

export async function discoverLinks(
  page: Page,
  targetUrl: string,
  productPathPatterns: RegExp[],
  maxPages: number,
): Promise<string[]> {
  const urls: string[] = [];
  let currentUrl = targetUrl;

  for (let pageIndex = 1; pageIndex <= maxPages; pageIndex += 1) {
    await page.goto(currentUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);

    const pageUrls = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLAnchorElement>("a[href]")]
        .map((anchor) => anchor.href)
        .filter(Boolean),
    );

    urls.push(
      ...pageUrls.filter((url) => productPathPatterns.some((pattern) => pattern.test(new URL(url).pathname))),
    );

    currentUrl = withPageNumber(targetUrl, pageIndex + 1);
  }

  return uniqueUrls(urls);
}

export async function scrapeWithFallback(
  page: Page,
  retailer: RetailerName,
  url: string,
  normalize: (snapshot: PageSnapshot, url: string) => ProductCore,
): Promise<ProductSnapshot> {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    const raw = await capturePageSnapshot(page);
    const core = normalize(raw, normalizeUrl(page.url(), url));
    return {
      core,
      raw,
      normalized: core,
      status: "ok",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      core: {
        retailer,
        url,
        name: "Unknown product",
      },
      raw: { url, errorMessage },
      normalized: {},
      status: "error",
      errorMessage,
    };
  }
}

export function normalizeGenericProduct(retailer: RetailerName, snapshot: PageSnapshot, fallbackUrl: string): ProductCore {
  const candidates = [
    ...findObjects(snapshot.jsonLd, looksLikeProduct),
    ...findObjects(snapshot.nextData, looksLikeProduct),
    ...findObjects(snapshot.scripts, looksLikeProduct),
  ];
  const product = candidates[0] ?? {};
  const offers = firstObject(product.offers) ?? firstObject(getPath(product, ["price", "offers"])) ?? {};
  const aggregate = firstObject(product.aggregateOffer) ?? {};

  const name = firstString(
    product.name,
    getPath(product, ["product", "name"]),
    snapshot.meta["og:title"],
    snapshot.title,
  ) ?? "Unknown product";

  const brandObject = firstObject(product.brand);
  const priceObject = firstObject(product.price);

  return {
    retailer,
    retailerProductId: firstString(product.sku, product.gtin, product.productId, product.id, getPath(product, ["product", "id"])),
    url: normalizeUrl(firstString(product.url, snapshot.url) ?? fallbackUrl, fallbackUrl),
    name,
    brand: firstString(brandObject?.name, product.brand, product.manufacturer),
    imageUrl: extractImage(product.image) ?? snapshot.meta["og:image"],
    packageSize: firstString(product.size, product.packageSize, product.cupMeasure, product.netContent),
    price: firstNumber(product.price, offers.price, aggregate.lowPrice, priceObject?.now, getPath(product, ["pricing", "now"])),
    unitPrice: firstString(product.unitPrice, product.cupString, product.pricePerUnit, product.comparisonPrice),
    availability: firstString(offers.availability, product.availability, product.stockStatus, product.status),
    currency: firstString(offers.priceCurrency, product.priceCurrency, "AUD"),
  };
}

function withPageNumber(url: string, pageNumber: number): string {
  const parsed = new URL(url);
  if (parsed.hostname.includes("woolworths.com.au")) {
    parsed.searchParams.set("pageNumber", String(pageNumber));
  } else {
    parsed.searchParams.set("page", String(pageNumber));
  }
  return parsed.toString();
}

function looksLikeProduct(candidate: Record<string, unknown>): boolean {
  const type = candidate["@type"];
  return (
    type === "Product" ||
    (Array.isArray(type) && type.includes("Product")) ||
    Boolean(candidate.name && (candidate.price || candidate.offers || candidate.image || candidate.brand))
  );
}

function firstObject(value: unknown): Record<string, unknown> | undefined {
  if (Array.isArray(value)) {
    return value.find((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}
