import { describe, expect, it } from "vitest";
import { validateConfig } from "../src/config/loadConfig.js";

// describe("validateConfig", () => {
  // it("applies defaults for optional scraper settings", () => {
  //   const config = validateConfig({
  //     database: {

  //     },
  //     schedule: { cron: "0 3 * * *" },
  //     retailers: [
  //       {
  //         name: "coles",
  //         enabled: true,
  //         targets: [{ name: "milk", url: "https://www.coles.com.au/search/products?q=milk" }],
  //       },
  //     ],
  //   });

  //   expect(config.browser.headless).toBe(true);
  //   expect(config.scrape.throttleMs).toBe(1500);
  //   expect(config.retailers[0]?.targets[0]?.maxPages).toBe(1);
  //   expect(config.retailers[0]?.targets[0]?.maxProducts).toBe(25);
  // });

  // it("rejects unsupported retailers", () => {
  //   expect(() =>
  //     validateConfig({
  //       database: { path: "data/test.sqlite" },
  //       schedule: { cron: "0 3 * * *" },
  //       retailers: [
  //         {
  //           name: "aldi" as "coles",
  //           enabled: true,
  //           targets: [{ name: "milk", url: "https://example.com" }],
  //         },
  //       ],
  //     }),
  //   ).toThrow(/must be woolworths or coles/);
  // });
// });
