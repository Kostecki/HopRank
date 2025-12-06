import path from "node:path";
import { defineConfig } from "drizzle-kit";

const DATABASE_PATH = process.env.DATABASE_PATH;
const DATABASE_NAME = process.env.DATABASE_NAME || "data.db";
if (!DATABASE_PATH) {
  throw new Error("DATABASE_PATH must be set in environment variables");
}

const fullDatabasePath = path.resolve(DATABASE_PATH, DATABASE_NAME);
const outPath = path.resolve(DATABASE_PATH, "migrations");
const schemaPath = path.resolve(DATABASE_PATH, "schema.server.ts");

console.log("drizzle.config.ts");
console.log("Database Path:", fullDatabasePath);
console.log("Migrations Output Path:", outPath);
console.log("Schema Path:", schemaPath);

export default defineConfig({
  out: outPath,
  schema: schemaPath,
  dialect: "sqlite",
  dbCredentials: {
    url: fullDatabasePath,
  },
});
