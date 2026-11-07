// Applies the migrations in ./drizzle at container start, with drizzle-orm's
// migrator, so the runtime image doesn't need drizzle-kit or pnpm. It tracks
// applied migrations in the same table as `drizzle-kit migrate`.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

const databasePath = process.env.DATABASE_PATH;
const databaseFileName = process.env.DATABASE_FILE_NAME || "data.db";
if (!databasePath) {
	throw new Error("DATABASE_PATH must be set");
}

fs.mkdirSync(databasePath, { recursive: true });

try {
	fs.accessSync(databasePath, fs.constants.W_OK);
	const file = path.join(databasePath, databaseFileName);
	if (fs.existsSync(file)) fs.accessSync(file, fs.constants.W_OK);
} catch {
	throw new Error(
		`${databasePath} isn't writable by uid ${process.getuid?.()}. ` +
			"The container runs as the non-root `node` user (uid 1000): chown the " +
			"database volume to 1000:1000.",
	);
}

const sqlite = new Database(path.resolve(databasePath, databaseFileName));
migrate(drizzle(sqlite), {
	migrationsFolder: path.resolve(import.meta.dirname, "../drizzle"),
});
sqlite.close();

console.log("Migrations applied");
