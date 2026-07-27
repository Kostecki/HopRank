import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import * as schema from "~/database/schema.server";

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

const TABLE_NAMES = [
  "ratings",
  "session_beers",
  "session_criteria",
  "session_state",
  "session_users",
  "sessions",
  "beers",
  "criteria",
  "pending_redirects",
  "users",
];

export function createTestDb(): TestDb {
  const sqlite = new Database(":memory:");
  sqlite.pragma("foreign_keys = ON");

  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: "drizzle" });

  return db;
}

export function resetTestDb(db: TestDb) {
  for (const table of TABLE_NAMES) {
    db.run(`DELETE FROM ${table}`);
  }
}
