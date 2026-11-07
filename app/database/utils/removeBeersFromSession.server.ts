import { and, eq, inArray } from "drizzle-orm";

import { SessionBeerStatus } from "~/types/session";

import { db } from "../config.server";
import { sessionBeers } from "../schema.server";
import { shuffleBeersInSession } from "./shuffleBeersInSession.server";

/**
 * Removes the user's own waiting beers from the session, in one transaction.
 * Returns how many were removed.
 */
export const removeBeersFromSession = (
	sessionId: number,
	beerInputs: number[],
	userId: number,
) => {
	if (beerInputs.length === 0) {
		return 0;
	}

	return db.transaction((tx) => {
		// Only "waiting" beers are removable, matching the UI's own
		// disabled-button rule (Navbar.tsx). Removing the current "rating" beer
		// would leave sessionState.currentBeerId pointing at a missing row, with
		// no way to vote or recover.
		const removed = tx
			.delete(sessionBeers)
			.where(
				and(
					eq(sessionBeers.sessionId, sessionId),
					inArray(sessionBeers.beerId, beerInputs),
					eq(sessionBeers.addedByUserId, userId),
					eq(sessionBeers.status, SessionBeerStatus.waiting),
				),
			)
			.returning({ id: sessionBeers.id })
			.all();

		if (removed.length > 0) {
			shuffleBeersInSession(sessionId, tx);
		}

		return removed.length;
	});
};
