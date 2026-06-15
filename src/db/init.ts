import { loadConfig } from "../config/loadConfig.js";
import { Pool, QueryResult } from "pg";
import { readFile } from "node:fs/promises";

const config = loadConfig(process.env.SCRAPER_CONFIG);
// make a connection
const pool = new Pool({
  connectionString: `${config.database.host}:${config.database.port}`
});
pool.on('error', (err, client) => {
      console.error('Unexpected error on idle client', err)
      process.exit(-1)
})
// read from postgres script file
const sql = await readFile(
  './schema.sql',
  'utf-8'
)
// execute the postgres script
const client = await pool.connect();
let res: QueryResult;
try {
  res = await client.query(sql);
} catch(error) {
} finally {
  client.release();
}

await pool.end();
console.log(`Initialized Postgres database ${config.database.database}`);
