import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { invariant } from "~/utils/invariant";

import {
  beers,
  criteria,
  pendingRedirects,
  ratings,
  sessionBeers,
  sessionBeersRelations,
  sessionCriteria,
  sessionCriteriaRelations,
  sessionState,
  sessions,
  sessionsRelations,
  sessionUsers,
  users,
} from "./schema.server";
import seedDatabase from "./seed";

const DATABASE_PATH = process.env.DATABASE_PATH;
const DATABASE_FILE_NAME = process.env.DATABASE_FILE_NAME || "data.db";
invariant(DATABASE_PATH, "DATABASE_PATH must be set in .env");

const fullDatabasePath = path.resolve(DATABASE_PATH, DATABASE_FILE_NAME);

console.log("config.server.ts");
console.log("Database Path:", fullDatabasePath);

// Ensure the database directory exists
if (!fs.existsSync(DATABASE_PATH)) {
  fs.mkdirSync(DATABASE_PATH, { recursive: true });
}

export const db = drizzle(new Database(fullDatabasePath), {
  schema: {
    users,
    sessions,
    sessionsRelations,
    sessionUsers,
    beers,
    sessionBeersRelations,
    sessionBeers,
    criteria,
    sessionCriteria,
    sessionCriteriaRelations,
    ratings,
    sessionState,
    pendingRedirects,
  },
});

const setupDatabase = async () => {
  await seedDatabase();
};

setupDatabase().catch((error) => {
  console.error("Error setting up the database:", error);
  process.exit(1);
});
