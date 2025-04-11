import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import invariant from "tiny-invariant";
import seedDatabase from "./seed";

const DATABASE_PATH = process.env.DATABASE_PATH;
invariant(DATABASE_PATH, "DATABASE_PATH must be defined");

export const db = drizzle(new Database(DATABASE_PATH));

await seedDatabase();
