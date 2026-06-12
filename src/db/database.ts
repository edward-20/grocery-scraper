import { migrate } from "./schema.js";
import { ScraperConfig } from "../types.js";
import { Pool } from "pg";


export function openDatabase(databaseConfig: ScraperConfig["database"]) : Pool {
  // make a connection
  const pool = new Pool({
    connectionString: `${databaseConfig.host}:${databaseConfig.port}`
  });
  pool.on('error', (err, client) => {
	console.error('Unexpected error on idle client', err)
	process.exit(-1)
  })
  // run the migration script
  migrate(pool);
  return pool;
}
