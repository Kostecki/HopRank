import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { env } from "~/utils/env.server";

import {
	barPlacements,
	beers,
	criteria,
	pendingRedirects,
	ratings,
	sessionBars,
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

const fullDatabasePath = path.resolve(
	env.DATABASE_PATH,
	env.DATABASE_FILE_NAME,
);

// Ensure the database directory exists
if (!fs.existsSync(env.DATABASE_PATH)) {
	fs.mkdirSync(env.DATABASE_PATH, { recursive: true });
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
		sessionBars,
		barPlacements,
	},
});

/** A transaction, as passed to db.transaction's callback. */
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Either the database or a transaction. better-sqlite3 transactions must be
 * synchronous, so helpers that take one use the sync finalizers
 * (.run()/.get()/.all()) and can run inside or outside a transaction.
 */
export type Executor = typeof db | Transaction;

const setupDatabase = async () => {
	await seedDatabase();
};

setupDatabase().catch((error) => {
	console.error("Error setting up the database:", error);
	process.exit(1);
});
