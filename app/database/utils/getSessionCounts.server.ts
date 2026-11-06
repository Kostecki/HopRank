import { and, count, eq } from "drizzle-orm";

import { SessionMode } from "~/types/session";

import { db } from "../config.server";
import {
	sessionBars,
	sessionBeers,
	sessionState,
	sessions,
	sessionUsers,
} from "../schema.server";

export const getSessionCounts = async (sessionId: number) => {
	try {
		const session = await db.query.sessions.findFirst({
			where: eq(sessions.id, sessionId),
			columns: { mode: true },
		});
		// In One Beer mode, each bar is one beer drunk.
		const countedTable =
			session?.mode === SessionMode.oneBeer ? sessionBars : sessionBeers;

		const [state, participantCount, beerCount] = await Promise.all([
			db.query.sessionState.findFirst({
				where: eq(sessionState.sessionId, sessionId),
			}),
			db
				.select({ count: count() })
				.from(sessionUsers)
				.where(
					and(
						eq(sessionUsers.sessionId, sessionId),
						eq(sessionUsers.active, true),
					),
				),
			db
				.select({ count: count() })
				.from(countedTable)
				.where(eq(countedTable.sessionId, sessionId)),
		]);

		return {
			state,
			participantCount: participantCount[0].count ?? 0,
			beerCount: beerCount[0].count ?? 0,
		};
	} catch (error) {
		console.error(
			"Error getting session counts for sessionId",
			sessionId,
			error,
		);

		// Distinguishes a genuine DB failure from a session that legitimately
		// has zero participants/beers (which returns this same zeroed shape
		// via the try branch above, without this flag).
		return {
			state: null,
			participantCount: 0,
			beerCount: 0,
			error: true as const,
		};
	}
};
