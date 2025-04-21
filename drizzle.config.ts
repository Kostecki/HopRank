import { defineConfig } from "drizzle-kit";
import invariant from "tiny-invariant";

const DATABASE_PATH = process.env.DATABASE_PATH;
invariant(DATABASE_PATH, "DATABASE_PATH must be set in .env");

export default defineConfig({
  out: "./app/database/migrations",
  schema: "./app/database/schema.server.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: DATABASE_PATH!,
  },
});
