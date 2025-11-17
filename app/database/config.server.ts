import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

import { invariant } from "~/utils/invariant";

import {
  beers,
  criteria,
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
const MIGRATIONS_PATH = process.env.MIGRATIONS_PATH;
invariant(DATABASE_PATH, "DATABASE_PATH must be set in .env");
invariant(MIGRATIONS_PATH, "MIGRATIONS_PATH must be set in .env");

fs.mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

export const db = drizzle(new Database(DATABASE_PATH), {
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
  },
});

const setupDatabase = async () => {
  console.log();
  console.log("Running Migrations");

  migrate(db, {
    migrationsFolder: MIGRATIONS_PATH,
  });

  await seedDatabase();
};

setupDatabase().catch((error) => {
  console.error("Error setting up the database:", error);
  process.exit(1);
});
