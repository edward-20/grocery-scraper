import { describe, expect, it } from "vitest";
import { normalizeGenericProduct } from "../src/adapters/common.js";
import type { PageSnapshot } from "../src/adapters/extraction.js";

describe("normalizeGenericProduct", () => {
  it("extracts core fields from JSON-LD product data", () => {
    const snapshot: PageSnapshot = {
      url: "https://www.woolworths.com.au/shop/productdetails/123/test-milk",
      title: "Test Milk",
      jsonLd: [
        {
          "@type": "Product",
          sku: "123",
          name: "Test Milk 2L",
          brand: { name: "Dairy Co" },
          image: ["https://example.com/image.jpg"],
          size: "2L",
          offers: {
            price: "4.50",
            priceCurrency: "AUD",
            availability: "https://schema.org/InStock",
          },
        },
      ],
      scripts: [],
      meta: {},
      text: "",
    };

    expect(normalizeGenericProduct("woolworths", snapshot, snapshot.url)).toMatchObject({
      retailer: "woolworths",
      retailerProductId: "123",
      name: "Test Milk 2L",
      brand: "Dairy Co",
      imageUrl: "https://example.com/image.jpg",
      packageSize: "2L",
      price: 4.5,
      availability: "https://schema.org/InStock",
      currency: "AUD",
    });
  });
});
