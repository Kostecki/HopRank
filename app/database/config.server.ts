import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import Database from "better-sqlite3";
import invariant from "tiny-invariant";

import seedDatabase from "./seed";

const DATABASE_PATH = process.env.DATABASE_PATH;
invariant(DATABASE_PATH, "DATABASE_PATH must be defined");

export const db = drizzle(new Database(DATABASE_PATH));

const setupDatabase = async () => {
  if (process.env.NODE_ENV === "development") {
    migrate(db, {
      migrationsFolder: "./app/database/migrations",
    });
  }

  await seedDatabase();
};

setupDatabase().catch((error) => {
  console.error("Error setting up the database:", error);
  process.exit(1);
});
