import { Pool, QueryResult } from "pg";
import { readFile } from "node:fs/promises";

export async function migrate(pool: Pool) : Promise<QueryResult> {
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
  } finally {
    client.release();
  }
  return res;
}
