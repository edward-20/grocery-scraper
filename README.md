# grocery-scraper

TypeScript scraper for Woolworths and Coles product pages. It uses Playwright to discover products from configured search/category URLs and stores normalized product fields plus raw snapshots in SQLite.

## Setup

```sh
pnpm install
pnpm exec playwright install chromium
pnpm db:init
```

Requires Node.js 22.16 or newer for the built-in `node:sqlite` module.

## Configuration

Edit `config/scraper.yaml`.

- `schedule.cron` is required for the worker.
- `retailers[].targets[]` controls the search/category URLs to scrape.
- `maxPages` and `maxProducts` keep each target bounded.
- Raw snapshots are stored on every scrape; current product rows are upserted by retailer and URL.

## Commands

```sh
pnpm scrape:once  # run enabled targets once
pnpm scrape       # start scheduled worker
pnpm test
pnpm typecheck
```

Use a different config file with:

```sh
SCRAPER_CONFIG=config/other.yaml pnpm scrape:once
```

## SQLite Tables

- `scrape_runs`: one row per target run.
- `products`: latest normalized product state.
- `product_snapshots`: append-only raw and normalized observations.

The scraper does not attempt to bypass anti-bot protections. If a retailer blocks automation or changes markup, the run records errors instead of silently inventing product data.
