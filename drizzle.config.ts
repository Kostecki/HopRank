import { defineConfig } from "drizzle-kit";

const DATABASE_NAME = process.env.DATABASE_NAME || "data.db";
const DATABASE_PATH = process.env.DATABASE_PATH;
if (!DATABASE_PATH) {
  throw new Error("DATABASE_PATH must be set in environment variables");
}

const fullDatabasePath = `${DATABASE_PATH}/${DATABASE_NAME}`;

export default defineConfig({
  out: "./app/database/migrations",
  schema: "./app/database/schema.server.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: fullDatabasePath,
  },
});
