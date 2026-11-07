import { and, eq } from "drizzle-orm";

import { SessionBeerStatus, SessionStatus } from "~/types/session";

import { shuffleBeersInSession } from "~/utils/shuffle";

import { db } from "../config.server";
import { sessionBeers, sessionState } from "../schema.server";
import { bumpLastUpdatedAt } from "./bumpLastUpdatedAt.server";
import { type BeerInput, upsertBeer } from "./upsertBeer.server";

export const addBeersToSession = async (
	sessionId: number,
	beerInputs: BeerInput[],
	userId: number,
) => {
	if (beerInputs.length === 0) {
		return;
	}

	const sessionBeersToInsert = [];
	for (const beerData of beerInputs) {
		const { untappdBeerId, name, breweryName, abv, style, label } = beerData;

		// abv is checked with isFinite rather than truthiness so 0% beers pass.
		if (
			!untappdBeerId ||
			!name ||
			!breweryName ||
			!Number.isFinite(abv) ||
			!style ||
			!label
		) {
			continue;
		}

		const beerId = await upsertBeer(beerData);

		// No explicit order: shuffleBeersInSession below always assigns it,
		// mixing every newly-added beer in among whatever is still waiting
		// rather than appending it after the entire list (see below).
		sessionBeersToInsert.push({
			sessionId,
			beerId,
			userId,
			addedByUserId: userId,
			status: SessionBeerStatus.waiting,
		});
	}

	if (sessionBeersToInsert.length > 0) {
		// onConflictDoNothing matters here: this is a single multi-row INSERT,
		// and without it, one beer in the batch already being in the session
		// (e.g. someone else added it moments ago, or a stale client-side
		// "already in session" check) would fail the *entire* statement
		// atomically, silently dropping every other, genuinely-new beer in
		// the same submission too.
		await db
			.insert(sessionBeers)
			.values(sessionBeersToInsert)
			.onConflictDoNothing({
				target: [sessionBeers.sessionId, sessionBeers.beerId],
			});

		// Always shuffle, even for a single added beer: someone joining a
		// running session and adding one beer at a time should have it mixed
		// into the remaining queue, not always appended at the very end.
		await shuffleBeersInSession(sessionId);

		const state = await db.query.sessionState.findFirst({
			where: eq(sessionState.sessionId, sessionId),
		});

		// If there is no current beer then set the first beer in the session as the current beer
		if (!state?.currentBeerId && state?.status === SessionStatus.active) {
			const ordered = await db.query.sessionBeers.findMany({
				where: and(
					eq(sessionBeers.sessionId, sessionId),
					eq(sessionBeers.status, SessionBeerStatus.waiting),
				),
				orderBy: (sb, { asc }) => asc(sb.order),
			});

			const firstBeer = ordered[0];
			if (firstBeer) {
				await db
					.update(sessionState)
					.set({
						currentBeerId: firstBeer.beerId,
						currentBeerOrder: firstBeer.order,
					})
					.where(eq(sessionState.sessionId, sessionId));

				await db
					.update(sessionBeers)
					.set({ status: SessionBeerStatus.rating })
					.where(eq(sessionBeers.id, firstBeer.id));
			}
		} else {
			//
			await bumpLastUpdatedAt(sessionId);
		}
	}
};
