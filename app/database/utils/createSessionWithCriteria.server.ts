import { db } from "../config.server";
import { sessionCriteria, sessionState, sessions } from "../schema.server";
import type { SelectSessions } from "../schema.types";

/**
 * Creates a session, its criteria links, and its initial session_state row
 * atomically. A synchronous transaction callback is required here:
 * better-sqlite3's transaction wrapper throws if the callback returns a
 * promise, so every query inside uses the sync .get()/.run() finalizers
 * instead of await. Without this, a failure partway through (e.g. an
 * invalid criterion id) used to leave a session row with no criteria and
 * no state, which could never be voted on.
 */
export function createSessionWithCriteria(input: {
	name: string;
	createdBy: number;
	joinCode: string;
	criterionIds: number[];
}): SelectSessions {
	const { name, createdBy, joinCode, criterionIds } = input;

	return db.transaction((tx) => {
		const session = tx
			.insert(sessions)
			.values({ name, createdBy, joinCode })
			.returning()
			.get();

		tx.insert(sessionCriteria)
			.values(
				criterionIds.map((criterionId) => ({
					sessionId: session.id,
					criterionId,
				})),
			)
			.run();

		tx.insert(sessionState).values({ sessionId: session.id }).run();

		return session;
	});
}
