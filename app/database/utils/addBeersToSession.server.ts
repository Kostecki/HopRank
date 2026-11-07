import { and, asc, eq } from "drizzle-orm";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

import type { BeerInput } from "~/schemas/beer";

import { db } from "../config.server";
import { sessionBeers, sessionState } from "../schema.server";
import { bumpLastUpdatedAt } from "./bumpLastUpdatedAt.server";
import { shuffleBeersInSession } from "./shuffleBeersInSession.server";
import { upsertBeer } from "./upsertBeer.server";

/**
 * Adds beers to a session, in one transaction. The beers must already be
 * validated (beerInputSchema).
 */
export const addBeersToSession = (
	sessionId: number,
	beerInputs: BeerInput[],
	userId: number,
) => {
	if (beerInputs.length === 0) {
		return;
	}

	db.transaction((tx) => {
		// No explicit order: shuffleBeersInSession below always assigns it,
		// mixing every newly-added beer in among whatever is still waiting
		// rather than appending it after the entire list.
		const sessionBeersToInsert = beerInputs.map((beerData) => ({
			sessionId,
			beerId: upsertBeer(beerData, tx),
			userId,
			addedByUserId: userId,
			status: SessionBeerStatus.waiting,
		}));

		// onConflictDoNothing matters here: this is a single multi-row INSERT,
		// and without it, one beer in the batch already being in the session
		// (e.g. someone else added it moments ago, or a stale client-side
		// "already in session" check) would fail the *entire* statement,
		// dropping every other, genuinely-new beer in the same submission too.
		tx.insert(sessionBeers)
			.values(sessionBeersToInsert)
			.onConflictDoNothing({
				target: [sessionBeers.sessionId, sessionBeers.beerId],
			})
			.run();

		// Always shuffle, even for a single added beer: someone joining a
		// running session and adding one beer at a time should have it mixed
		// into the remaining queue, not always appended at the very end.
		shuffleBeersInSession(sessionId, tx);

		const state = tx
			.select()
			.from(sessionState)
			.where(eq(sessionState.sessionId, sessionId))
			.get();

		// An active session with no current beer (every beer was rated) starts
		// on the first new one.
		if (!state?.currentBeerId && state?.status === SessionStatus.active) {
			const firstBeer = tx
				.select()
				.from(sessionBeers)
				.where(
					and(
						eq(sessionBeers.sessionId, sessionId),
						eq(sessionBeers.status, SessionBeerStatus.waiting),
					),
				)
				.orderBy(asc(sessionBeers.order))
				.get();

			if (firstBeer) {
				tx.update(sessionState)
					.set({
						currentBeerId: firstBeer.beerId,
						currentBeerOrder: firstBeer.order,
					})
					.where(eq(sessionState.sessionId, sessionId))
					.run();

				tx.update(sessionBeers)
					.set({ status: SessionBeerStatus.rating })
					.where(eq(sessionBeers.id, firstBeer.id))
					.run();
			}
		} else {
			bumpLastUpdatedAt(sessionId, tx);
		}
	});
};
