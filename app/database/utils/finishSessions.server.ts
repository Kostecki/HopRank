import { inArray } from "drizzle-orm";

import { SessionStatus } from "~/types/session";

import { db } from "../config.server";
import { sessionState, sessionUsers } from "../schema.server";

/**
 * Finishes sessions and takes everyone out of them. No exit reason is set: they
 * stayed until the end, rather than leaving or being kicked. The current beer is
 * cleared so that one still being rated shows up in the results as unrated,
 * instead of disappearing from them.
 */
export function finishSessions(sessionIds: number[]) {
	if (sessionIds.length === 0) return;

	db.transaction((tx) => {
		tx.update(sessionState)
			.set({
				status: SessionStatus.finished,
				currentBeerId: null,
				currentBeerOrder: null,
			})
			.where(inArray(sessionState.sessionId, sessionIds))
			.run();

		tx.update(sessionUsers)
			.set({ active: false })
			.where(inArray(sessionUsers.sessionId, sessionIds))
			.run();
	});
}
