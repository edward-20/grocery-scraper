import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { migrate } from "./schema.js";

export function openDatabase(path: string): DatabaseSync {
  if (path === ":memory:") {
    const db = new DatabaseSync(path);
    migrate(db);
    return db;
  }

  const absolutePath = resolve(path);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const db = new DatabaseSync(absolutePath);
  migrate(db);
  return db;
}
