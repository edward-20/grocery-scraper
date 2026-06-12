import { loadConfig } from "../config/loadConfig.js";
import { openDatabase } from "./database.js";

const config = loadConfig(process.env.SCRAPER_CONFIG);
const pool = openDatabase(config.database);
await pool.end();
console.log(`Initialized Postgres database ${config.database.database}`);
