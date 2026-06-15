import { loadConfig } from "../config/loadConfig.js";
import { Pool, QueryResult } from "pg";
import { readFile } from "node:fs/promises";

const config = loadConfig(process.env.SCRAPER_CONFIG);

export function makeConnectionPool() : Pool {
  const pool = new Pool({
    connectionString: `${config.database.host}:${config.database.port}`
  });
  pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
  })
  return pool
}


const pool = makeConnectionPool();
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
  console.error(error); // this needs ot be looked into more
} finally {
  client.release();
}

await pool.end();
console.log(`Initialized Postgres database ${config.database.database}`);
