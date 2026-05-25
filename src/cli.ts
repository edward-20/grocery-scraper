import { loadConfig } from "./config/loadConfig.js";
import { openDatabase } from "./db/database.js";
import { GroceryRepository } from "./db/repository.js";
import { runScrape } from "./scraper/runScraper.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);
const db = openDatabase(config.database.path);
const repository = new GroceryRepository(db);

try {
  const summary = await runScrape(config, repository);
  console.log(
    `Scrape complete: ${summary.targets} target(s), ${summary.discoveredProducts} discovered product(s), ` +
      `${summary.savedSnapshots} snapshot(s), ${summary.errors} error(s).`,
  );
} finally {
  db.close();
}
