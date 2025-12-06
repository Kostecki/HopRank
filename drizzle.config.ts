import path from "node:path";
import { defineConfig } from "drizzle-kit";

const DATABASE_PATH = process.env.DATABASE_PATH;
const DATABASE_FILE_NAME = process.env.DATABASE_FILE_NAME || "data.db";
if (!DATABASE_PATH) {
  throw new Error("DATABASE_PATH must be set in environment variables");
}

const fullDatabasePath = path.resolve(DATABASE_PATH, DATABASE_FILE_NAME);
const schemaPath = path.resolve(DATABASE_PATH, "schema.server.ts");

export default defineConfig({
  schema: schemaPath,
  dialect: "sqlite",
  dbCredentials: {
    url: fullDatabasePath,
  },
});
