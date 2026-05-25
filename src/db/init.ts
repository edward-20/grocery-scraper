import { loadConfig } from "../config/loadConfig.js";
import { openDatabase } from "./database.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);
const db = openDatabase(config.database.path);
db.close();
console.log(`Initialized SQLite database at ${config.database.path}`);
