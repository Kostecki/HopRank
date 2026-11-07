import path from "node:path";
import { defineConfig } from "drizzle-kit";

const DATABASE_PATH = process.env.DATABASE_PATH;
const DATABASE_FILE_NAME = process.env.DATABASE_FILE_NAME || "data.db";
if (!DATABASE_PATH) {
	throw new Error("DATABASE_PATH must be set in environment variables");
}

const fullDatabasePath = path.resolve(DATABASE_PATH, DATABASE_FILE_NAME);

export default defineConfig({
	schema: "./app/database/schema.server.ts",
	dialect: "sqlite",
	dbCredentials: {
		url: fullDatabasePath,
	},
});
